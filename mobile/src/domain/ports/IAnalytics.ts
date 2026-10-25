export type AnalyticsConsent = "granted" | "denied";
export type AnalyticsEvent =
  | "map_open"
  | "nearby_open"
  | "search"
  | "view_aed"
  | "sign_up"
  | "login";
export type AnalyticsScreen =
  | "map"
  | "nearby"
  | "profile"
  | "aed_detail"
  | "add_aed"
  | "login"
  | "register";
export interface IAnalytics {
  getConsent(): Promise<AnalyticsConsent | null>;
  setConsent(consent: AnalyticsConsent): Promise<void>;
  track(event: AnalyticsEvent): Promise<void>;
  screen(screen: AnalyticsScreen): Promise<void>;
  campaign(url: string): Promise<void>;
}
