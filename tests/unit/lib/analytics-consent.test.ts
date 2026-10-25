import { beforeEach, describe, expect, it, vi } from "vitest";
import { readAnalyticsConsent, saveAnalyticsConsent } from "@/lib/analytics-consent";

describe("analytics consent failure handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.gtag = vi.fn();
    saveAnalyticsConsent("granted");
  });

  it("shouldPrioritizeRevocationWhenLocalStorageCannotBeWritten", () => {
    vi.spyOn(window.Storage.prototype, "getItem").mockReturnValue("granted");
    vi.spyOn(window.Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });

    saveAnalyticsConsent("denied");

    expect(readAnalyticsConsent()).toBe("denied");
  });

  it("shouldDisableGoogleImmediatelyWhenConsentIsRevoked", () => {
    saveAnalyticsConsent("denied");

    expect(Reflect.get(window, "ga-disable-G-2T0E7S05N5")).toBe(true);
  });

  it("shouldKeepDenialAfterReloadWhenTheOldGrantedCookieCannotBeUpdated", async () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue("deamap-analytics-consent-v1=granted");
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {});

    const persisted = saveAnalyticsConsent("denied");
    vi.resetModules();
    const reloaded = await import("@/lib/analytics-consent");

    expect(persisted).toBe(false);
    expect(reloaded.readAnalyticsConsent()).toBe("denied");
  });
});
