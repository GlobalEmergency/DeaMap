import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirebaseAnalytics } from "@capacitor-firebase/analytics";
import { Preferences } from "@capacitor/preferences";
import { App } from "@capacitor/app";
import { CapacitorAnalytics } from "./CapacitorAnalytics";

vi.mock("@capacitor-firebase/analytics", () => ({
  ConsentType: {
    AnalyticsStorage: "ANALYTICS_STORAGE",
    AdStorage: "AD_STORAGE",
    AdUserData: "AD_USER_DATA",
    AdPersonalization: "AD_PERSONALIZATION",
  },
  ConsentStatus: { Granted: "GRANTED", Denied: "DENIED" },
  FirebaseAnalytics: {
    setConsent: vi.fn().mockResolvedValue(undefined),
    setEnabled: vi.fn().mockResolvedValue(undefined),
    logEvent: vi.fn().mockResolvedValue(undefined),
    setCurrentScreen: vi.fn().mockResolvedValue(undefined),
    resetAnalyticsData: vi.fn().mockResolvedValue(undefined),
  },
}));
const values = new Map<string, string>();
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    getLaunchUrl: vi.fn(async () => undefined),
  },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: values.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => {
      values.set(key, value);
    }),
  },
}));

describe("CapacitorAnalytics", () => {
  beforeEach(() => {
    values.clear();
    vi.clearAllMocks();
  });

  it("shouldNotSendAnEventBeforeConsent", async () => {
    const analytics = new CapacitorAnalytics();

    await analytics.track("map_open");

    expect(FirebaseAnalytics.logEvent).not.toHaveBeenCalled();
  });

  it("shouldRecordFirstMeasuredUseOnlyOnceAfterConsent", async () => {
    const analytics = new CapacitorAnalytics();

    await analytics.setConsent("granted");
    await analytics.setConsent("granted");

    expect(FirebaseAnalytics.logEvent).toHaveBeenCalledExactlyOnceWith({
      name: "app_first_use",
      params: { measurement_version: 1 },
    });
  });

  it("shouldKeepAdvertisingConsentDeniedWhenAnalyticsIsAccepted", async () => {
    await new CapacitorAnalytics().setConsent("granted");

    expect(FirebaseAnalytics.setConsent).toHaveBeenCalledWith({
      type: "AD_STORAGE",
      status: "DENIED",
    });
  });

  it("shouldStopSendingEventsImmediatelyWhenConsentIsRevoked", async () => {
    const analytics = new CapacitorAnalytics();
    await analytics.setConsent("granted");
    vi.mocked(FirebaseAnalytics.logEvent).mockClear();

    const revoked = analytics.setConsent("denied");
    await analytics.track("map_open");
    await revoked;

    expect(FirebaseAnalytics.logEvent).not.toHaveBeenCalled();
  });

  it("shouldFailClosedWhenTheSdkCannotApplyConsent", async () => {
    const analytics = new CapacitorAnalytics();
    vi.mocked(FirebaseAnalytics.setEnabled).mockRejectedValueOnce(new Error("unavailable"));

    await expect(analytics.setConsent("granted")).rejects.toThrow("unavailable");
    await analytics.track("map_open");

    expect(FirebaseAnalytics.logEvent).not.toHaveBeenCalled();
  });

  it("shouldNotClearFirstMeasuredUseWhenConsentIsWithdrawn", async () => {
    const analytics = new CapacitorAnalytics();
    await analytics.setConsent("granted");
    await analytics.setConsent("denied");

    expect(Preferences.set).toHaveBeenCalledWith({
      key: "deamap-analytics-first-use-v1",
      value: "recorded",
    });
  });

  it("shouldDisableTheSdkWhenSavingConsentFails", async () => {
    const analytics = new CapacitorAnalytics();
    vi.mocked(Preferences.set).mockRejectedValueOnce(new Error("storage unavailable"));

    await expect(analytics.setConsent("granted")).rejects.toThrow("storage unavailable");

    expect(FirebaseAnalytics.setEnabled).toHaveBeenLastCalledWith({ enabled: false });
  });

  it("shouldNotMeasureFirstUseWhenAcceptanceIsImmediatelyRevoked", async () => {
    const analytics = new CapacitorAnalytics();

    await Promise.all([analytics.setConsent("granted"), analytics.setConsent("denied")]);

    expect(FirebaseAnalytics.logEvent).not.toHaveBeenCalled();
  });

  it("shouldProcessTheLaunchCampaignBeforeFirstMeasuredUse", async () => {
    vi.mocked(App.getLaunchUrl).mockResolvedValueOnce({
      url: "deamap://open?utm_source=newsletter&utm_medium=email",
    });

    await new CapacitorAnalytics().setConsent("granted");

    expect(vi.mocked(FirebaseAnalytics.logEvent).mock.calls.map(([event]) => event.name)).toEqual([
      "campaign_details",
      "app_first_use",
    ]);
  });
});
