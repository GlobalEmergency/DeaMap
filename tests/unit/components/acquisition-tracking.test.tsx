import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import AcquisitionTracking from "@/components/AcquisitionTracking";
import { saveAnalyticsConsent } from "@/lib/analytics-consent";

describe("store acquisition tracking", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    saveAnalyticsConsent("denied");
    window.gtag = vi.fn();
    Object.defineProperty(document, "referrer", {
      configurable: true,
      value: "https://www.google.es/search?q=private-address",
    });
  });
  function setup() {
    render(
      <>
        <AcquisitionTracking />
        <a
          href="https://play.google.com/store/apps/details?id=es.deamap.mobile"
          data-download-placement="footer"
          onClick={(event) => event.preventDefault()}
        >
          Android
        </a>
      </>
    );
    return document.querySelector("a")!;
  }

  it("shouldKeepDownloadsWorkingWithoutAnalyticsConsent", () => {
    const link = setup();

    fireEvent.click(link);

    expect(vi.mocked(window.gtag!).mock.calls.filter((call) => call[0] === "event")).toHaveLength(
      0
    );
    expect(link.search).toBe("?id=es.deamap.mobile");
  });

  it("shouldCarryTheWebChannelIntoThePlayReferrerAndEmitOneDownloadClick", () => {
    saveAnalyticsConsent("granted");
    const link = setup();

    fireEvent.click(link);

    expect(
      new URLSearchParams(new URL(link.href).searchParams.get("referrer")!).get("utm_source")
    ).toBe("google");
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "app_store_click",
      expect.objectContaining({
        send_to: "G-2T0E7S05N5",
        target_store: "android",
        placement: "footer",
        acquisition_source: "google",
      })
    );
  });

  it("shouldStopDecoratingAndSendingWhenConsentIsWithdrawn", () => {
    saveAnalyticsConsent("granted");
    const link = setup();

    saveAnalyticsConsent("denied");
    fireEvent.click(link);

    expect(vi.mocked(window.gtag!).mock.calls.filter((call) => call[0] === "event")).toHaveLength(
      0
    );
    expect(link.search).toBe("?id=es.deamap.mobile");
  });

  it("shouldRemoveExistingAttributionWhenRevocationCannotBeSaved", () => {
    saveAnalyticsConsent("granted");
    const link = setup();
    fireEvent.click(link);
    expect(link.href).toContain("referrer=");
    vi.spyOn(window.Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {});

    saveAnalyticsConsent("denied");
    fireEvent.click(link);

    expect(link.search).toBe("?id=es.deamap.mobile");
    expect(vi.mocked(window.gtag!).mock.calls.filter((call) => call[0] === "event")).toHaveLength(
      1
    );
  });

  it("shouldKeepTheStoreLinkWorkingWhenTheAnalyticsFunctionThrows", () => {
    saveAnalyticsConsent("granted");
    const link = setup();
    window.gtag = vi.fn(() => {
      throw new Error("blocked");
    });

    fireEvent.click(link);

    expect(link.href).toContain("referrer=");
  });
});
