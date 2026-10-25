import { detectAcquisition, parseCampaignUrl, type Acquisition } from "../../shared/acquisition";

const SESSION_KEY = "deamap-acquisition-v1";

export function getWebAcquisition(): Acquisition {
  const detected = detectAcquisition(window.location.href, document.referrer);
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored && !parseCampaignUrl(window.location.href)) {
      const value: unknown = JSON.parse(stored);
      if (
        typeof value === "object" &&
        value !== null &&
        "source" in value &&
        typeof value.source === "string" &&
        "medium" in value &&
        typeof value.medium === "string" &&
        "updatedAt" in value &&
        typeof value.updatedAt === "number" &&
        Date.now() - value.updatedAt < 30 * 60 * 1000
      ) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...value, updatedAt: Date.now() }));
        return detectAcquisition(
          `https://deamap.es/?${new URLSearchParams({ utm_source: value.source, utm_medium: value.medium })}`,
          ""
        );
      }
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...detected, updatedAt: Date.now() }));
  } catch {
    /* Attribution must not prevent navigation when storage is unavailable. */
  }
  return detected;
}

export function clearWebAcquisition(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage may be disabled. */
  }
}
