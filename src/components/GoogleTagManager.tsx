"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { CONSENT_EVENT, CONSENT_KEY, readAnalyticsConsent } from "@/lib/analytics-consent";
import { getWebAcquisition } from "@/lib/web-acquisition";

const GTM_ID = "GTM-5BLL9B87";

export function GoogleTagManagerHead() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    setAllowed(readAnalyticsConsent() === "granted");
    const change = (event: globalThis.Event) =>
      setAllowed((event as globalThis.CustomEvent).detail === "granted");
    const changedInAnotherTab = (event: globalThis.StorageEvent) => {
      if (event.key === CONSENT_KEY) window.location.reload();
    };
    window.addEventListener(CONSENT_EVENT, change);
    window.addEventListener("storage", changedInAnotherTab);
    return () => {
      window.removeEventListener(CONSENT_EVENT, change);
      window.removeEventListener("storage", changedInAnotherTab);
    };
  }, []);
  if (!allowed) return null;
  const campaign = getWebAcquisition();

  return (
    <Script
      id="gtm-script"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer=window.dataLayer||[];
          window.gtag=function(){window.dataLayer.push(arguments);};
          gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
          gtag('set',{allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+location.pathname,page_referrer:document.referrer.split('?')[0].split('#')[0]});
          gtag('set',${JSON.stringify({ campaign_source: campaign.source, campaign_medium: campaign.medium, campaign_name: campaign.campaign })});
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `,
      }}
    />
  );
}

export function GoogleTagManagerBody() {
  // A noscript iframe would load tags without the user's analytics choice.
  return null;
}
