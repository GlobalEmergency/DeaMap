"use client";

import { useEffect } from "react";
import { APPLE_PROVIDER_TOKEN, STORE_URLS, buildStoreUrl } from "../../shared/acquisition";
import { WEB_MEASUREMENT_ID, readAnalyticsConsent } from "@/lib/analytics-consent";
import { getWebAcquisition } from "@/lib/web-acquisition";

export default function OpenAppRedirect() {
  useEffect(() => {
    const allowed = readAnalyticsConsent() === "granted";
    const campaign = allowed ? getWebAcquisition() : null;
    const store = (platform: "ios" | "android") => {
      if (document.hidden) return;
      const currentCampaign = readAnalyticsConsent() === "granted" ? campaign : null;
      try {
        if (currentCampaign)
          window.gtag?.("event", "app_store_click", {
            send_to: WEB_MEASUREMENT_ID,
            target_store: platform,
            placement: "open_redirect",
            interaction_type: "automatic",
            acquisition_source: currentCampaign.source,
            acquisition_medium: currentCampaign.medium,
            acquisition_campaign: currentCampaign.campaign,
            transport_type: "beacon",
          });
      } catch {
        /* Measurement must never block opening the store. */
      }
      window.location.replace(
        currentCampaign
          ? buildStoreUrl(platform, currentCampaign, "open_redirect", APPLE_PROVIDER_TOKEN)
          : STORE_URLS[platform]
      );
    };
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      store("ios");
      return;
    }
    if (!/Android/i.test(navigator.userAgent)) return;
    const params = campaign
      ? new URLSearchParams({
          utm_source: campaign.source,
          utm_medium: campaign.medium,
          utm_campaign: campaign.campaign,
        }).toString()
      : "";
    let opened = false;
    const onHidden = () => {
      if (document.hidden) opened = true;
    };
    document.addEventListener("visibilitychange", onHidden);
    window.location.href = `intent://open${params ? "?" + params : ""}#Intent;scheme=deamap;package=es.deamap.mobile;end`;
    const timer = setTimeout(() => {
      if (!opened) store("android");
    }, 1500);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  return null;
}
