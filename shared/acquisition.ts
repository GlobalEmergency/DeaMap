export interface Acquisition {
  source: string;
  medium: string;
  campaign: "deamap_web";
}

const CHANNELS: Record<string, string> = {
  google: "organic",
  bing: "organic",
  yahoo: "organic",
  duckduckgo: "organic",
  ecosia: "organic",
  chatgpt: "ai-assistant",
  perplexity: "ai-assistant",
  gemini: "ai-assistant",
  copilot: "ai-assistant",
  facebook: "social",
  instagram: "social",
  linkedin: "social",
  telegram: "social",
  whatsapp: "social",
  newsletter: "email",
  email: "email",
  qr: "qr",
  partner: "referral",
  direct: "none",
  other: "referral",
};

function acquisition(source: string, paid = false): Acquisition {
  const known = Object.prototype.hasOwnProperty.call(CHANNELS, source) ? source : "other";
  return { source: known, medium: paid ? "cpc" : CHANNELS[known], campaign: "deamap_web" };
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function parseCampaignUrl(value: string): Acquisition | null {
  const url = parseUrl(value);
  if (!url) return null;
  let source = url.searchParams.get("utm_source")?.toLowerCase();
  if (!source && ["gclid", "gbraid", "wbraid"].some((key) => url.searchParams.has(key)))
    return acquisition("google", true);
  if (!source && url.searchParams.has("msclkid")) return acquisition("bing", true);
  if (!source) return null;
  const aliases: Record<string, string> = {
    "chatgpt.com": "chatgpt",
    "perplexity.ai": "perplexity",
    "gemini.google.com": "gemini",
    "copilot.microsoft.com": "copilot",
  };
  if (Object.prototype.hasOwnProperty.call(aliases, source)) source = aliases[source];
  const medium = url.searchParams.get("utm_medium");
  return acquisition(source, medium === "cpc" || medium === "ppc" || medium === "paid");
}

export function detectAcquisition(location: string, referrer: string): Acquisition {
  const tagged = parseCampaignUrl(location);
  if (tagged) return tagged;
  const current = parseUrl(location);
  const referring = parseUrl(referrer);
  if (!referring || referring.host === current?.host) return acquisition("direct");
  const host = referring.hostname.toLowerCase().replace(/^www\./, "");
  const domains: Record<string, string> = {
    "google.com": "google",
    "google.es": "google",
    "bing.com": "bing",
    "duckduckgo.com": "duckduckgo",
    "ecosia.org": "ecosia",
    "chatgpt.com": "chatgpt",
    "chat.openai.com": "chatgpt",
    "perplexity.ai": "perplexity",
    "gemini.google.com": "gemini",
    "copilot.microsoft.com": "copilot",
    "copilot.com": "copilot",
    "facebook.com": "facebook",
    "instagram.com": "instagram",
    "linkedin.com": "linkedin",
    "t.me": "telegram",
    "telegram.org": "telegram",
    "whatsapp.com": "whatsapp",
    "yahoo.com": "yahoo",
  };
  const match = Object.keys(domains).find(
    (domain) => host === domain || host.endsWith("." + domain)
  );
  return acquisition(match ? domains[match] : "other");
}

export const STORE_URLS = {
  ios: "https://apps.apple.com/app/id6760004634",
  android: "https://play.google.com/store/apps/details?id=es.deamap.mobile",
} as const;

// Public provider identifier verified in App Store Connect's campaign generator.
export const APPLE_PROVIDER_TOKEN = "119094239";

export type AppPlatform = keyof typeof STORE_URLS;

export function getStorePlatform(href: string): AppPlatform | null {
  const url = parseUrl(href);
  if (url?.hostname === "play.google.com" && url.searchParams.get("id") === "es.deamap.mobile")
    return "android";
  if (url?.hostname === "apps.apple.com" && /\/id6760004634\/?$/.test(url.pathname)) return "ios";
  return null;
}

export function buildStoreUrl(
  platform: AppPlatform,
  campaign: Acquisition,
  placement: string,
  appleProviderToken?: string
): string {
  const url = new URL(STORE_URLS[platform]);
  const safePlacement = /^[a-z_]{1,32}$/.test(placement) ? placement : "web";
  // Reclassify untrusted stored values rather than forwarding arbitrary UTM text.
  const safe = acquisition(campaign.source, campaign.medium === "cpc");
  if (platform === "android") {
    url.searchParams.set(
      "referrer",
      new URLSearchParams({
        utm_source: safe.source,
        utm_medium: safe.medium,
        utm_campaign: safe.campaign,
        utm_content: safePlacement,
      }).toString()
    );
  } else if (appleProviderToken && /^\d{1,20}$/.test(appleProviderToken)) {
    url.searchParams.set("pt", appleProviderToken);
    // Keep campaigns broad enough to meet Apple's reporting thresholds.
    url.searchParams.set("ct", `web_${safe.source}_${safe.medium.replace(/-/g, "_")}`);
    url.searchParams.set("mt", "8");
  }
  return url.toString();
}
