#!/usr/bin/env node
/**
 * Submits an uploaded iOS build for App Store review, through the App Store
 * Connect API. Node 22+, no dependencies (fetch + node:crypto).
 *
 *   1. find the app by bundle id;
 *   2. wait until the build with this CFBundleVersion is processed (VALID);
 *   3. find or create the editable App Store version for the version string
 *      (renaming the editable one if it has another string, e.g. the "1.0"
 *      App Store Connect creates with the app record);
 *   4. attach the build;
 *   5. answer the age rating questions the owner has declared, where the
 *      editable app info still has them unanswered (DECLARED_AGE_RATING);
 *   6. set "What's New" on every localization of the version (creating the
 *      WHATSNEW_LOCALE one if missing; skipped if Apple refuses it, as it does
 *      for the very first version);
 *   7. add the version to a review submission (reusing an open one) and submit it.
 *
 * Idempotent: a version already waiting for or in review is left alone.
 * After an App Review rejection, the old UNRESOLVED_ISSUES submission is
 * canceled only if Apple refuses to resubmit it (see isStaleRejectedSubmission).
 *
 * `node app-store-submit.mjs check` only tells whether this build number is
 * already in App Store Connect (any processing state), as `uploaded=true|false`
 * on stdout and in $GITHUB_OUTPUT: a build number can only be uploaded once.
 *
 * Adapted from vgpastor/sacadiez-app (via vgpastor/RocStatus) .github/scripts/app-store-submit.mjs.
 *
 * Environment:
 *   APP_STORE_CONNECT_API_KEY_ID, APP_STORE_CONNECT_API_ISSUER_ID,
 *   APP_STORE_CONNECT_API_KEY_BASE64 (the .p8 PEM, base64)   credentials
 *   BUNDLE_ID            optional, default es.deamap.mobile
 *   APP_VERSION          1.2.3 (CFBundleShortVersionString)
 *   BUILD_NUMBER         10203 (CFBundleVersion)
 *   RELEASE_NOTES_DIR    optional, folder with whatsnew-<locale> files for "What's New";
 *                        a locale without its own file gets the WHATSNEW_LOCALE one
 *   WHATSNEW_LOCALE      optional, default es-ES (localization created if missing)
 *   BUILD_TIMEOUT_MINUTES optional, default 45
 *
 * Logs progress and Apple's error details, never the credentials.
 */
import { createPrivateKey, sign } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.appstoreconnect.apple.com";
const EDITABLE_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
  "METADATA_REJECTED",
  "INVALID_BINARY",
  "WAITING_FOR_EXPORT_COMPLIANCE",
  // In an open review submission but not submitted (e.g. a previous run failed
  // on the final submit): resumable.
  "READY_FOR_REVIEW",
]);
const ALREADY_SUBMITTED_STATES = new Set([
  "WAITING_FOR_REVIEW",
  "IN_REVIEW",
  "PENDING_DEVELOPER_RELEASE",
  "PENDING_APPLE_RELEASE",
  "PROCESSING_FOR_APP_STORE",
  "READY_FOR_SALE",
  "READY_FOR_DISTRIBUTION",
  "ACCEPTED",
  "PROCESSING_FOR_DISTRIBUTION",
  // Live once, later replaced or pulled: nothing to submit either.
  "REPLACED_WITH_NEW_VERSION",
  "REMOVED_FROM_SALE",
  "DEVELOPER_REMOVED_FROM_SALE",
  "PREORDER_READY_FOR_SALE",
  "PENDING_CONTRACT",
]);
const OPEN_SUBMISSION_STATES = ["READY_FOR_REVIEW", "UNRESOLVED_ISSUES"];
const EDITABLE_APP_INFO_STATES = new Set([
  "PREPARE_FOR_SUBMISSION",
  "DEVELOPER_REJECTED",
  "REJECTED",
]);
// Answers the owner declared on 2026-11-03 to the age rating questions Apple
// added later. Only written where the editable app info leaves them unanswered,
// so a later change made in App Store Connect is never overwritten.
const DECLARED_AGE_RATING = {
  socialMedia: false,
  socialMediaAgeRestricted: false,
};
const IN_FLIGHT_SUBMISSION_STATES = ["WAITING_FOR_REVIEW", "IN_REVIEW"];

const env = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") fail(`${name} is not set`);
  return value;
};

const keyId = env("APP_STORE_CONNECT_API_KEY_ID");
const issuerId = env("APP_STORE_CONNECT_API_ISSUER_ID");
const privateKey = createPrivateKey(
  Buffer.from(env("APP_STORE_CONNECT_API_KEY_BASE64"), "base64").toString("utf8")
);
const bundleId = env("BUNDLE_ID", "es.deamap.mobile");
const versionString = env("APP_VERSION");
const buildNumber = env("BUILD_NUMBER");
const locale = env("WHATSNEW_LOCALE", "es-ES");
const timeoutMinutes = Number(env("BUILD_TIMEOUT_MINUTES", "45"));
const notesDir = process.env.RELEASE_NOTES_DIR;
const notesFor = (where) => {
  for (const l of [where, locale]) {
    const file = notesDir && join(notesDir, `whatsnew-${l}`);
    if (file && existsSync(file)) return readFileSync(file, "utf8").trim();
  }
  return "";
};
const whatsNew = notesFor(locale);

// ---------------------------------------------------------------- API client

let cachedToken = { value: "", expiresAt: 0 };

function token() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken.expiresAt - now > 60) return cachedToken.value;
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const exp = now + 15 * 60; // Apple caps tokens at 20 minutes
  const unsigned = `${b64({ alg: "ES256", kid: keyId, typ: "JWT" })}.${b64({ iss: issuerId, iat: now, exp, aud: "appstoreconnect-v1" })}`;
  const signature = sign("sha256", Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  cachedToken = {
    value: `${unsigned}.${signature.toString("base64url")}`,
    expiresAt: exp,
  };
  return cachedToken.value;
}

class AppleApiError extends Error {
  constructor(method, path, status, errors) {
    const line = (e, indent) =>
      `${indent}- [${e.code ?? e.status}] ${e.title ?? ""}: ${e.detail ?? ""}`;
    // Apple puts the real cause of a 409 on submit in meta.associatedErrors.
    const details = (errors ?? [])
      .flatMap((e) => [
        line(e, "  "),
        ...Object.values(e.meta?.associatedErrors ?? {})
          .flat()
          .map((a) => line(a, "      ")),
      ])
      .join("\n");
    super(`${method} ${path} -> HTTP ${status}${details ? `\n${details}` : ""}`);
    this.status = status;
    this.errors = errors ?? [];
  }

  /** `detail` of every error, associated errors included. */
  allDetails() {
    return this.errors.flatMap((e) => [
      e.detail ?? "",
      ...Object.values(e.meta?.associatedErrors ?? {})
        .flat()
        .map((a) => a.detail ?? ""),
    ]);
  }
}

async function api(method, path, body) {
  for (let attempt = 1; ; attempt++) {
    // Network failures, rate limits and transient server errors (whose body
    // may be a gateway's HTML page): retry a few times.
    const canRetry = attempt < 4;
    const retry = async (reason) => {
      log(`  ${method} ${path} -> ${reason}, retrying (${attempt}/3)`);
      await sleep(attempt * 10_000);
    };
    let res;
    try {
      res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if (!canRetry) throw err;
      await retry(err.message);
      continue;
    }
    if (res.status === 204) return undefined;
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && canRetry) {
      await retry(`HTTP ${res.status}`);
      continue;
    }
    if (res.ok) return text ? JSON.parse(text) : undefined;
    throw new AppleApiError(method, path, res.status, parseErrors(text));
  }
}

function parseErrors(text) {
  try {
    return JSON.parse(text).errors;
  } catch {
    return undefined;
  }
}

const rel = (type, id) => ({ data: { type, id } });

// ---------------------------------------------------------------- steps

async function findApp() {
  const res = await api("GET", `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`);
  const app = res.data?.[0];
  if (!app) {
    fail(
      `No app with bundle id "${bundleId}" in App Store Connect.\n` +
        "  Create the app record first (App Store Connect > Apps > + > New App) and re-run the workflow."
    );
  }
  log(`App: ${app.attributes.name} (${app.id})`);
  return app;
}

async function findBuild(appId) {
  const query =
    `/v1/builds?filter[app]=${appId}&filter[version]=${encodeURIComponent(buildNumber)}` +
    `&filter[preReleaseVersion.version]=${encodeURIComponent(versionString)}&limit=1`;
  return (await api("GET", query)).data?.[0];
}

async function waitForBuild(appId) {
  const deadline = Date.now() + timeoutMinutes * 60_000;
  let lastState = "";
  for (;;) {
    const build = await findBuild(appId);
    const state = build ? build.attributes.processingState : "NOT_YET_VISIBLE";
    if (state !== lastState) {
      log(`Build ${versionString} (${buildNumber}): ${state}`);
      lastState = state;
    }
    if (state === "VALID") return build;
    if (state === "FAILED" || state === "INVALID") {
      fail(
        `Build ${buildNumber} is ${state} in App Store Connect: check the email Apple sent about it.`
      );
    }
    if (Date.now() > deadline) {
      fail(
        `Build ${buildNumber} not processed after ${timeoutMinutes} min (last state ${state}).\n` +
          '  The upload is done: once Apple finishes processing, re-run only the failed "ios-submit" job of this run.'
      );
    }
    await sleep(30_000);
  }
}

async function ensureExportCompliance(build) {
  // Info.plist does not set ITSAppUsesNonExemptEncryption, so Apple asks on
  // every build: the app only uses HTTPS, which is exempt.
  if (
    build.attributes.usesNonExemptEncryption === null ||
    build.attributes.usesNonExemptEncryption === undefined
  ) {
    await api("PATCH", `/v1/builds/${build.id}`, {
      data: {
        type: "builds",
        id: build.id,
        attributes: { usesNonExemptEncryption: false },
      },
    });
    log("Export compliance: declared no non-exempt encryption");
  }
}

const stateOf = (v) => v.attributes.appVersionState ?? v.attributes.appStoreState;

/** Returns the version to submit, or undefined if this version is already submitted or live. */
async function findOrCreateVersion(appId) {
  const versions =
    (await api("GET", `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=200`)).data ??
    [];
  const same = versions.find((v) => v.attributes.versionString === versionString);
  if (same) {
    const state = stateOf(same);
    if (EDITABLE_STATES.has(state)) {
      log(`App Store version ${versionString}: exists (${state})`);
      return same;
    }
    if (ALREADY_SUBMITTED_STATES.has(state)) {
      log(`App Store version ${versionString} is already ${state}: nothing to submit.`);
      return undefined;
    }
    fail(
      `App Store version ${versionString} is in state ${state}, which cannot be edited or submitted.`
    );
  }

  // Only an older editable version is reused: one prepared by hand for a later
  // release is left alone (Apple then refuses a second editable version, loudly).
  const editable = versions.find(
    (v) => EDITABLE_STATES.has(stateOf(v)) && isOlder(v.attributes.versionString, versionString)
  );
  if (editable) {
    log(
      `App Store version: renaming editable "${editable.attributes.versionString}" (${stateOf(editable)}) to ${versionString}`
    );
    const res = await api("PATCH", `/v1/appStoreVersions/${editable.id}`, {
      data: {
        type: "appStoreVersions",
        id: editable.id,
        attributes: { versionString },
      },
    });
    return res.data;
  }

  log(`App Store version ${versionString}: creating`);
  const res = await api("POST", "/v1/appStoreVersions", {
    data: {
      type: "appStoreVersions",
      attributes: {
        platform: "IOS",
        versionString,
        releaseType: "AFTER_APPROVAL",
      },
      relationships: { app: rel("apps", appId) },
    },
  });
  return res.data;
}

async function attachBuild(version, build) {
  await api(
    "PATCH",
    `/v1/appStoreVersions/${version.id}/relationships/build`,
    rel("builds", build.id)
  );
  log(`Build ${buildNumber} attached to version ${versionString}`);
}

async function answerAgeRatingQuestions(appId) {
  const appInfos = (await api("GET", `/v1/apps/${appId}/appInfos?limit=10`)).data ?? [];
  const editable = appInfos.find((i) =>
    EDITABLE_APP_INFO_STATES.has(i.attributes.state ?? i.attributes.appStoreState)
  );
  if (!editable) {
    log("Age rating: no editable app info, nothing to answer");
    return;
  }
  const declaration = (await api("GET", `/v1/appInfos/${editable.id}/ageRatingDeclaration`)).data;
  const unanswered = Object.fromEntries(
    Object.entries(DECLARED_AGE_RATING).filter(
      ([question]) => declaration.attributes[question] === null
    )
  );
  if (Object.keys(unanswered).length === 0) {
    log("Age rating: declared questions already answered");
    return;
  }
  await api("PATCH", `/v1/ageRatingDeclarations/${declaration.id}`, {
    data: {
      type: "ageRatingDeclarations",
      id: declaration.id,
      attributes: unanswered,
    },
  });
  log(`Age rating: answered ${JSON.stringify(unanswered)}`);
}

async function setWhatsNew(version) {
  if (!whatsNew) {
    log("What's New: no release notes file, skipped");
    return;
  }
  const localizations =
    (await api("GET", `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`))
      .data ?? [];
  // Apple refuses "What's New" on the very first version of an app: any 4xx
  // on it is logged and skipped, it never blocks the submission.
  const tolerateRefusedWhatsNew = (where, err) => {
    if (!(err instanceof AppleApiError) || err.status >= 500) throw err;
    log(
      `What's New (${where}): not accepted by Apple, skipped (expected on the first version)\n${err.message}`
    );
  };
  for (const localization of localizations) {
    const where = localization.attributes.locale;
    try {
      await api("PATCH", `/v1/appStoreVersionLocalizations/${localization.id}`, {
        data: {
          type: "appStoreVersionLocalizations",
          id: localization.id,
          attributes: { whatsNew: notesFor(where) },
        },
      });
      log(`What's New (${where}): set`);
    } catch (err) {
      tolerateRefusedWhatsNew(where, err);
    }
  }
  if (localizations.some((l) => l.attributes.locale === locale)) return;
  log(
    `Localization ${locale} missing on the version: creating it (fill its description and keywords in App Store Connect)`
  );
  try {
    await createLocalization(version, { locale, whatsNew });
    log(`What's New (${locale}): set`);
  } catch (err) {
    tolerateRefusedWhatsNew(locale, err);
    await createLocalization(version, { locale });
  }
}

function createLocalization(version, attributes) {
  return api("POST", "/v1/appStoreVersionLocalizations", {
    data: {
      type: "appStoreVersionLocalizations",
      attributes,
      relationships: { appStoreVersion: rel("appStoreVersions", version.id) },
    },
  });
}

async function submitForReview(appId, version) {
  const list = async (states) =>
    (
      await api(
        "GET",
        `/v1/reviewSubmissions?filter[app]=${appId}&filter[platform]=IOS&filter[state]=${states.join(",")}&limit=50`
      )
    ).data ?? [];

  for (const submission of await list(IN_FLIGHT_SUBMISSION_STATES)) {
    if (await submissionHasVersion(submission.id, version.id)) {
      log(
        `Version ${versionString} is already in review submission ${submission.id} (${submission.attributes.state}).`
      );
      return;
    }
  }

  let submission = (await list(OPEN_SUBMISSION_STATES))[0];
  if (submission) {
    log(`Review submission: reusing ${submission.id} (${submission.attributes.state})`);
  } else {
    submission = await createSubmission(appId);
  }

  try {
    await addAndSubmit(submission, version);
  } catch (err) {
    if (!(await isStaleRejectedSubmission(err, submission, version))) throw err;
    log(
      `Review submission ${submission.id} (UNRESOLVED_ISSUES) refused:\n${err.message}\nCanceling it and starting a new one.`
    );
    await cancelSubmission(submission.id);
    await addAndSubmit(await createSubmission(appId), version);
  }
}

/**
 * A submission rejected by App Review keeps its REJECTED items: Apple refuses
 * to submit it again ("Version is not ready to be submitted yet") and to change
 * its items. Only that refusal, on a submission holding this version, warrants
 * canceling it (seen on 2026-11-03 with 1.10.0).
 */
async function isStaleRejectedSubmission(err, submission, version) {
  return (
    err instanceof AppleApiError &&
    err.status === 409 &&
    submission.attributes.state === "UNRESOLVED_ISSUES" &&
    err.allDetails().some((d) => /not ready to be submitted/i.test(d)) &&
    (await submissionHasVersion(submission.id, version.id))
  );
}

async function createSubmission(appId) {
  const submission = (
    await api("POST", "/v1/reviewSubmissions", {
      data: {
        type: "reviewSubmissions",
        attributes: { platform: "IOS" },
        relationships: { app: rel("apps", appId) },
      },
    })
  ).data;
  log(`Review submission: created ${submission.id}`);
  return submission;
}

function patchSubmission(submissionId, attributes) {
  return api("PATCH", `/v1/reviewSubmissions/${submissionId}`, {
    data: { type: "reviewSubmissions", id: submissionId, attributes },
  });
}

async function addAndSubmit(submission, version) {
  if (await submissionHasVersion(submission.id, version.id)) {
    log(`Review submission already contains version ${versionString}`);
  } else {
    await api("POST", "/v1/reviewSubmissionItems", {
      data: {
        type: "reviewSubmissionItems",
        relationships: {
          reviewSubmission: rel("reviewSubmissions", submission.id),
          appStoreVersion: rel("appStoreVersions", version.id),
        },
      },
    });
    log(`Review submission: version ${versionString} added`);
  }

  await patchSubmission(submission.id, { submitted: true });
  log(`Submitted version ${versionString} (build ${buildNumber}) for App Store review.`);
}

const CANCEL_POLL_MS = 30_000;
const CANCEL_POLL_ATTEMPTS = 20;

/** Cancels a review submission and waits until Apple has closed it (CANCELING is transient). */
async function cancelSubmission(submissionId) {
  await patchSubmission(submissionId, { canceled: true });
  for (let attempt = 1; ; attempt++) {
    const state = (await api("GET", `/v1/reviewSubmissions/${submissionId}`)).data.attributes.state;
    if (state === "COMPLETE") {
      log(`Review submission ${submissionId}: canceled`);
      return;
    }
    if (attempt === CANCEL_POLL_ATTEMPTS) {
      fail(
        `Review submission ${submissionId} still ${state} after canceling it ` +
          `(${(CANCEL_POLL_ATTEMPTS * CANCEL_POLL_MS) / 60_000} min): re-run the "ios-submit" job.`
      );
    }
    await sleep(CANCEL_POLL_MS);
  }
}

async function submissionHasVersion(submissionId, versionId) {
  const items =
    (
      await api(
        "GET",
        `/v1/reviewSubmissions/${submissionId}/items?include=appStoreVersion&limit=50`
      )
    ).data ?? [];
  return items.some((item) => item.relationships?.appStoreVersion?.data?.id === versionId);
}

// ---------------------------------------------------------------- main

function log(message) {
  console.log(message);
}

function fail(message) {
  console.error(`::error::${message.split("\n")[0]}`);
  console.error(message);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Numeric x.y.z comparison: isOlder('1.0', '1.0.12') and isOlder('1.0.9', '1.0.10'). */
function isOlder(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff < 0;
  }
  return false;
}

async function check() {
  const build = await findBuild((await findApp()).id);
  const uploaded = Boolean(build);
  log(
    `Build ${versionString} (${buildNumber}): ${uploaded ? `already in App Store Connect (${build.attributes.processingState})` : "not uploaded yet"}`
  );
  log(`uploaded=${uploaded}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `uploaded=${uploaded}\n`);
  }
}

async function main() {
  if (process.argv[2] === "check") return check();
  log(`Submitting ${bundleId} ${versionString} (build ${buildNumber}) for App Store review`);
  const app = await findApp();
  // Version first: one already in review or live needs no build at all.
  const version = await findOrCreateVersion(app.id);
  if (!version) return;
  const build = await waitForBuild(app.id);
  await ensureExportCompliance(build);
  await attachBuild(version, build);
  await answerAgeRatingQuestions(app.id);
  await setWhatsNew(version);
  await submitForReview(app.id, version);
}

main().catch((err) =>
  fail(err instanceof AppleApiError ? err.message : (err.stack ?? String(err)))
);
