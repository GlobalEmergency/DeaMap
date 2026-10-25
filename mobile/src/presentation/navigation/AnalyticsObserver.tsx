import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { AnalyticsScreen } from "../../domain/ports/IAnalytics";
import { useAnalytics } from "../store/AnalyticsContext";

export default function AnalyticsObserver() {
  const { analytics, ready } = useAnalytics();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!ready) return;
    const screens: Record<string, AnalyticsScreen> = {
      "/tabs/map": "map",
      "/tabs/nearby": "nearby",
      "/tabs/profile": "profile",
      "/new-dea": "add_aed",
      "/login": "login",
      "/register": "register",
    };
    const screen = pathname.startsWith("/dea/") ? "aed_detail" : screens[pathname];
    if (!screen) return;
    void analytics.screen(screen);
    if (screen === "map") void analytics.track("map_open");
    if (screen === "nearby") void analytics.track("nearby_open");
    if (screen === "aed_detail") void analytics.track("view_aed");
  }, [analytics, ready, pathname]);
  return null;
}
