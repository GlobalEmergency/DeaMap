// Runnable check for app-store-submit.mjs against a fake App Store Connect. No network,
// no credentials. Adapted from vgpastor/RocStatus. MOCK_CASE picks the scenario:
//   stale      (default) the old UNRESOLVED_ISSUES submission refuses to be resubmitted
//              ("not ready to be submitted"): it must be canceled, then the version
//              submitted in a new one, and the script must exit 0.
//   other-409  the refusal has another cause: nothing may be canceled and the script
//              must exit 1.
//   newer-editable  only a later version (1.0.14) is editable: it must not be renamed;
//              the script tries to create 1.0.13, Apple refuses and the script exits 1.
// When the version is submitted, only the unanswered declared age rating question (socialMedia) is written.
//
//   KEY=$(node -e "const {generateKeyPairSync}=require('crypto');console.log(Buffer.from(generateKeyPairSync('ec',{namedCurve:'P-256'}).privateKey.export({type:'pkcs8',format:'pem'})).toString('base64'))")
//   APP_STORE_CONNECT_API_KEY_ID=k APP_STORE_CONNECT_API_ISSUER_ID=i APP_STORE_CONNECT_API_KEY_BASE64=$KEY \
//   APP_VERSION=1.0.13 BUILD_NUMBER=10013 [MOCK_CASE=other-409] \
//   node --import ./.github/scripts/test/app-store-submit.mock.mjs .github/scripts/app-store-submit.mjs
//
// Prints "MOCK CHECK OK" and exits 0 when the scenario behaves as expected.

const scenario = process.env.MOCK_CASE ?? "stale";
const refusalDetail =
  scenario === "stale"
    ? "Version is not ready to be submitted yet, please try again later."
    : "You must provide a value for the attribute copyright.";

// The script polls with sleep(): make every wait instant.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, _ms, ...args) => realSetTimeout(fn, 0, ...args);

const events = [];
let cancelPolls = 0;

const json = (status, payload) => new globalThis.Response(JSON.stringify(payload), { status });
const data = (payload) => json(200, { data: payload });

globalThis.fetch = async (url, { method = "GET", body } = {}) => {
  const { pathname, search } = new URL(url);
  const route = pathname + search;
  const attributes = body ? JSON.parse(body).data?.attributes : undefined;

  if (route.startsWith("/v1/apps?")) return data([{ id: "app", attributes: { name: "DeaMap" } }]);
  if (route.startsWith("/v1/builds?"))
    return data([
      { id: "build", attributes: { processingState: "VALID", usesNonExemptEncryption: false } },
    ]);
  if (route.startsWith("/v1/apps/app/appStoreVersions"))
    return data(
      scenario === "newer-editable"
        ? [
            {
              id: "later",
              attributes: { versionString: "1.0.14", appVersionState: "PREPARE_FOR_SUBMISSION" },
            },
          ]
        : [{ id: "version", attributes: { versionString: "1.0.13", appVersionState: "REJECTED" } }]
    );
  if (method === "PATCH" && route === "/v1/appStoreVersions/later") {
    events.push("rename later (wrong)");
    return data({ id: "later", attributes });
  }
  if (method === "POST" && route === "/v1/appStoreVersions") {
    events.push("create version (refused)");
    return json(409, {
      errors: [
        {
          status: "409",
          code: "ENTITY_ERROR",
          detail: "You cannot create a new version of the App in the current state.",
        },
      ],
    });
  }
  if (route === "/v1/appStoreVersions/version/relationships/build")
    return new globalThis.Response(null, { status: 204 });

  if (route.startsWith("/v1/apps/app/appInfos"))
    return data([
      { id: "live", attributes: { state: "READY_FOR_DISTRIBUTION" } },
      { id: "info", attributes: { state: "PREPARE_FOR_SUBMISSION" } },
    ]);
  if (route === "/v1/appInfos/info/ageRatingDeclaration")
    return data({
      id: "rating",
      attributes: { socialMedia: null, socialMediaAgeRestricted: false },
    });
  if (method === "PATCH" && route === "/v1/ageRatingDeclarations/rating") {
    events.push(`age rating ${JSON.stringify(attributes)}`);
    return data({ id: "rating", attributes });
  }

  if (route.startsWith("/v1/reviewSubmissions?"))
    return data(
      route.includes("UNRESOLVED_ISSUES")
        ? [{ id: "old", attributes: { state: "UNRESOLVED_ISSUES" } }]
        : []
    );
  if (route.startsWith("/v1/reviewSubmissions/old/items"))
    return data([{ relationships: { appStoreVersion: { data: { id: "version" } } } }]);
  if (route.startsWith("/v1/reviewSubmissions/new/items")) return data([]);

  if (method === "PATCH" && route === "/v1/reviewSubmissions/old" && attributes.submitted) {
    events.push("submit old (refused)");
    return json(409, {
      errors: [
        {
          status: "409",
          code: "STATE_ERROR.ENTITY_STATE_INVALID",
          detail: "This resource cannot be reviewed, please check associated errors to see why.",
          meta: {
            associatedErrors: {
              "/v1/appStoreVersions/version": [{ code: "STATE_ERROR", detail: refusalDetail }],
            },
          },
        },
      ],
    });
  }
  if (method === "PATCH" && route === "/v1/reviewSubmissions/old" && attributes.canceled) {
    events.push("cancel old");
    return data({ id: "old", attributes: { state: "CANCELING" } });
  }
  if (method === "GET" && route === "/v1/reviewSubmissions/old")
    return data({ id: "old", attributes: { state: ++cancelPolls < 2 ? "CANCELING" : "COMPLETE" } });
  if (method === "POST" && route === "/v1/reviewSubmissions") {
    events.push("create new");
    return data({ id: "new", attributes: { state: "READY_FOR_REVIEW" } });
  }
  if (method === "POST" && route === "/v1/reviewSubmissionItems") return data({ id: "item" });
  if (method === "PATCH" && route === "/v1/reviewSubmissions/new" && attributes.submitted) {
    events.push("submit new");
    return data({ id: "new", attributes: { state: "WAITING_FOR_REVIEW" } });
  }

  return json(404, { errors: [{ status: "404", detail: `not mocked: ${method} ${route}` }] });
};

const ageRating = 'age rating {"socialMedia":false}';
const expected = {
  stale: {
    events: [ageRating, "submit old (refused)", "cancel old", "create new", "submit new"],
    exitCode: 0,
  },
  "other-409": { events: [ageRating, "submit old (refused)"], exitCode: 1 },
  "newer-editable": { events: ["create version (refused)"], exitCode: 1 },
}[scenario];

process.on("exit", (code) => {
  const problems = [];
  if (JSON.stringify(events) !== JSON.stringify(expected.events))
    problems.push(`events ${JSON.stringify(events)}, expected ${JSON.stringify(expected.events)}`);
  if (code !== expected.exitCode) problems.push(`exit code ${code}, expected ${expected.exitCode}`);
  console.log(
    problems.length
      ? `MOCK CHECK FAILED (${scenario}): ${problems.join("; ")}`
      : `MOCK CHECK OK (${scenario})`
  );
  process.exitCode = problems.length ? 1 : 0;
});
