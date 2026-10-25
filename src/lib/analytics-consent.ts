export const CONSENT_KEY = "deamap-analytics-consent-v1";
export const CONSENT_EVENT = "deamap-analytics-consent";
export const WEB_MEASUREMENT_ID = "G-2T0E7S05N5";
export type AnalyticsConsent = "granted" | "denied";
let pageConsent: AnalyticsConsent | null = null;

function readSavedChoices(): AnalyticsConsent[] {
  const choices: AnalyticsConsent[] = [];
  try {
    const cookie = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(CONSENT_KEY + "="))
      ?.split("=")[1];
    if (cookie === "granted" || cookie === "denied") choices.push(cookie);
  } catch {
    /* Other storage may still be available. */
  }
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === "granted" || value === "denied") choices.push(value);
  } catch {
    /* Other storage may still be available. */
  }
  return choices;
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (pageConsent !== null) return pageConsent;
  const choices = readSavedChoices();
  return choices.includes("denied") ? "denied" : choices.includes("granted") ? "granted" : null;
}

export function saveAnalyticsConsent(value: AnalyticsConsent): boolean {
  pageConsent = value;
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* Choice still applies to this page. */
  }
  try {
    document.cookie = `${CONSENT_KEY}=${value}; Path=/; SameSite=Lax; Max-Age=15552000${window.location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* The in-page choice remains authoritative when all storage is blocked. */
  }
  const choices = readSavedChoices();
  const persisted = choices.length > 0 && choices.every((choice) => choice === value);
  Reflect.set(window, `ga-disable-${WEB_MEASUREMENT_ID}`, value === "denied");
  try {
    window.gtag?.("consent", "update", {
      analytics_storage: value,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  } catch {
    /* The GA disable flag applies even if a blocker replaces gtag. */
  }
  if (value === "denied") {
    try {
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.trim().split("=")[0];
        if (!/^(_ga($|_)|_gid$|_gat)/.test(name)) continue;
        const expired = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
        document.cookie = expired;
        document.cookie = `${expired}; Domain=${window.location.hostname}`;
        if (window.location.hostname.endsWith("deamap.es"))
          document.cookie = `${expired}; Domain=deamap.es`;
      }
    } catch {
      /* Revocation must also work when cookies are inaccessible. */
    }
  }
  window.dispatchEvent(new window.CustomEvent(CONSENT_EVENT, { detail: value }));
  return persisted;
}
