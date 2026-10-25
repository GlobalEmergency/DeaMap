import type { IAnalytics } from "../../domain/ports/IAnalytics";

export class NoOpAnalytics implements IAnalytics {
  async getConsent() {
    return "denied" as const;
  }
  async setConsent() {}
  async track() {}
  async screen() {}
  async campaign() {}
}
