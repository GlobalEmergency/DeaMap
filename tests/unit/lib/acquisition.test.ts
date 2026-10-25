import { describe, expect, it } from "vitest";
import { buildStoreUrl, detectAcquisition, parseCampaignUrl } from "../../../shared/acquisition";

describe("acquisition", () => {
  it("shouldRecognizeTheSourceAddedByChatGPTLinks", () => {
    expect(parseCampaignUrl("https://deamap.es/?utm_source=chatgpt.com")).toMatchObject({
      source: "chatgpt",
      medium: "ai-assistant",
    });
  });

  it("shouldClassifyGoogleAdClicksWithoutForwardingTheirIdentifiers", () => {
    expect(detectAcquisition("https://deamap.es/?gclid=private-click-id", "")).toEqual({
      source: "google",
      medium: "cpc",
      campaign: "deamap_web",
    });
  });
  it("shouldKeepTheSearchChannelWhenOpeningGooglePlay", () => {
    const campaign = detectAcquisition(
      "https://deamap.es/app",
      "https://www.google.es/search?q=private-address"
    );

    const link = new URL(buildStoreUrl("android", campaign, "footer"));
    const referrer = new URLSearchParams(link.searchParams.get("referrer")!);

    expect(Object.fromEntries(referrer)).toEqual({
      utm_source: "google",
      utm_medium: "organic",
      utm_campaign: "deamap_web",
      utm_content: "footer",
    });
  });

  it("shouldUseKnownCampaignChannelsWithoutForwardingFreeText", () => {
    const campaign = detectAcquisition(
      "https://deamap.es/app?utm_source=newsletter&utm_medium=email&utm_campaign=victor@example.com&email=private@example.com",
      ""
    );

    expect(campaign).toEqual({ source: "newsletter", medium: "email", campaign: "deamap_web" });
  });

  it("shouldClassifyAssistantAndSocialReferrals", () => {
    expect(detectAcquisition("https://deamap.es/app", "https://chatgpt.com/")).toMatchObject({
      source: "chatgpt",
      medium: "ai-assistant",
    });
  });

  it("shouldAvoidTreatingLookalikeDomainsAsGoogle", () => {
    expect(
      detectAcquisition("https://deamap.es/app", "https://google.com.evil.test/")
    ).toMatchObject({ source: "other", medium: "referral" });
  });

  it("shouldAddAppleCampaignParametersWhenProviderTokenIsKnown", () => {
    const url = new URL(
      buildStoreUrl(
        "ios",
        { source: "google", medium: "organic", campaign: "deamap_web" },
        "app_page",
        "123456"
      )
    );

    expect(Object.fromEntries(url.searchParams)).toEqual({
      pt: "123456",
      ct: "web_google_organic",
      mt: "8",
    });
  });

  it("shouldNotPretendAppleAttributionWorksWithoutProviderToken", () => {
    expect(
      new URL(
        buildStoreUrl("ios", { source: "direct", medium: "none", campaign: "deamap_web" }, "footer")
      ).searchParams.has("ct")
    ).toBe(false);
  });

  it("shouldReadOnlyKnownChannelsFromAnIncomingAppLink", () => {
    expect(
      parseCampaignUrl(
        "deamap://open?utm_source=facebook&utm_medium=anything&email=private@example.com"
      )
    ).toEqual({ source: "facebook", medium: "social", campaign: "deamap_web" });
  });

  it("shouldIgnoreAnUntaggedLaunchInsteadOfOverwritingInstallAttribution", () => {
    expect(parseCampaignUrl("deamap://open")).toBeNull();
  });
});
