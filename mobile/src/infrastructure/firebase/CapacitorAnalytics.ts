import { ConsentStatus, ConsentType, FirebaseAnalytics } from "@capacitor-firebase/analytics";
import { Preferences } from "@capacitor/preferences";
import { App } from "@capacitor/app";
import type {
  AnalyticsConsent,
  AnalyticsEvent,
  AnalyticsScreen,
  IAnalytics,
} from "../../domain/ports/IAnalytics";
import { parseCampaignUrl } from "../../../../shared/acquisition";

const CONSENT_KEY = "deamap-analytics-consent-v1";
const FIRST_USE_KEY = "deamap-analytics-first-use-v1";

export class CapacitorAnalytics implements IAnalytics {
  private enabled = false;
  private revision = 0;
  private pending: Promise<void> = Promise.resolve();
  private campaignListenerStarted = false;

  async getConsent(): Promise<AnalyticsConsent | null> {
    try {
      const { value } = await Preferences.get({ key: CONSENT_KEY });
      return value === "granted" || value === "denied" ? value : null;
    } catch {
      return null;
    }
  }

  setConsent(consent: AnalyticsConsent): Promise<void> {
    this.enabled = false;
    const revision = ++this.revision;
    const operation = this.pending
      .catch(() => undefined)
      .then(async () => {
        if (revision !== this.revision) return;
        await FirebaseAnalytics.setEnabled({ enabled: false });
        for (const type of [
          ConsentType.AdStorage,
          ConsentType.AdUserData,
          ConsentType.AdPersonalization,
        ]) {
          await FirebaseAnalytics.setConsent({ type, status: ConsentStatus.Denied });
        }
        await FirebaseAnalytics.setConsent({
          type: ConsentType.AnalyticsStorage,
          status: consent === "granted" ? ConsentStatus.Granted : ConsentStatus.Denied,
        });
        await FirebaseAnalytics.setEnabled({ enabled: consent === "granted" });
        if (consent === "denied") await FirebaseAnalytics.resetAnalyticsData();
        await Preferences.set({ key: CONSENT_KEY, value: consent });
        this.enabled = consent === "granted" && revision === this.revision;
        if (this.enabled) {
          await this.startCampaignTracking();
          await this.recordFirstUse();
        }
      });
    this.pending = operation.catch(async (error) => {
      this.enabled = false;
      await FirebaseAnalytics.setEnabled({ enabled: false }).catch(() => undefined);
      await FirebaseAnalytics.setConsent({
        type: ConsentType.AnalyticsStorage,
        status: ConsentStatus.Denied,
      }).catch(() => undefined);
      throw error;
    });
    return this.pending;
  }

  private async startCampaignTracking(): Promise<void> {
    if (this.campaignListenerStarted) return;
    this.campaignListenerStarted = true;
    void App.addListener("appUrlOpen", ({ url }) => {
      void this.campaign(url);
    }).catch(() => {
      this.campaignListenerStarted = false;
    });
    const launch = await App.getLaunchUrl().catch(() => undefined);
    if (launch?.url) await this.campaign(launch.url);
  }

  private async recordFirstUse(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: FIRST_USE_KEY });
      if (value || !this.enabled) return;
      // First consented measurement, not proof of a new store installation.
      await FirebaseAnalytics.logEvent({
        name: "app_first_use",
        params: { measurement_version: 1 },
      });
      await Preferences.set({ key: FIRST_USE_KEY, value: "recorded" });
    } catch {
      /* A later launch retries; measurement must never block the map. */
    }
  }

  async track(event: AnalyticsEvent): Promise<void> {
    if (!this.enabled) return;
    try {
      await FirebaseAnalytics.logEvent({ name: event });
    } catch {
      /* Nonessential telemetry. */
    }
  }

  async screen(screen: AnalyticsScreen): Promise<void> {
    if (!this.enabled) return;
    try {
      await FirebaseAnalytics.setCurrentScreen({
        screenName: screen,
        screenClassOverride: "DeaMap",
      });
    } catch {
      /* Nonessential telemetry. */
    }
  }

  async campaign(url: string): Promise<void> {
    if (!this.enabled) return;
    const campaign = parseCampaignUrl(url);
    if (!campaign) return;
    try {
      await FirebaseAnalytics.logEvent({ name: "campaign_details", params: campaign });
    } catch {
      /* Nonessential telemetry. */
    }
  }
}
