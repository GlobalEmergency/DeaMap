"use client";

import { useEffect } from "react";
import {
  APPLE_PROVIDER_TOKEN,
  STORE_URLS,
  buildStoreUrl,
  getStorePlatform,
} from "../../shared/acquisition";
import { CONSENT_EVENT, WEB_MEASUREMENT_ID, readAnalyticsConsent } from "@/lib/analytics-consent";
import { clearWebAcquisition, getWebAcquisition } from "@/lib/web-acquisition";

export default function AcquisitionTracking() {
  useEffect(() => {
    let allowed = readAnalyticsConsent() === "granted";
    if (allowed) getWebAcquisition();
    const onConsent = (event: globalThis.Event) => {
      allowed = (event as globalThis.CustomEvent).detail === "granted";
      if (allowed) getWebAcquisition();
      else {
        clearWebAcquisition();
        document.querySelectorAll("a").forEach((anchor) => {
          const platform = getStorePlatform(anchor.href);
          if (platform) anchor.href = STORE_URLS[platform];
        });
      }
    };
    const onClick = (event: globalThis.MouseEvent) => {
      if (
        (event.type === "click" && event.button !== 0) ||
        (event.type === "auxclick" && event.button !== 1)
      )
        return;
      const anchor = event.target instanceof window.Element ? event.target.closest("a") : null;
      if (!anchor) return;
      const platform = getStorePlatform(anchor.href);
      if (!platform) return;
      if (!allowed) {
        anchor.href = STORE_URLS[platform];
        return;
      }
      const campaign = getWebAcquisition();
      const placement =
        anchor.dataset.downloadPlacement ||
        (anchor.closest("footer")
          ? "footer"
          : window.location.pathname === "/app"
            ? "app_page"
            : "web");
      anchor.href = buildStoreUrl(platform, campaign, placement, APPLE_PROVIDER_TOKEN);
      try {
        window.gtag?.("event", "app_store_click", {
          send_to: WEB_MEASUREMENT_ID,
          target_store: platform,
          placement,
          acquisition_source: campaign.source,
          acquisition_medium: campaign.medium,
          acquisition_campaign: campaign.campaign,
          transport_type: "beacon",
        });
      } catch {
        /* Measurement must never block opening the store. */
      }
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);
  return null;
}
