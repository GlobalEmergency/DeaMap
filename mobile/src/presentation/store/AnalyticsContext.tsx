import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AnalyticsConsent, IAnalytics } from "../../domain/ports/IAnalytics";

interface AnalyticsContextValue {
  analytics: IAnalytics;
  ready: boolean;
  showPreferences: () => void;
}
const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({
  analytics,
  available,
  children,
}: {
  analytics: IAnalytics;
  available: boolean;
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    void analytics
      .getConsent()
      .then(async (choice) => {
        if (choice) await analytics.setConsent(choice);
        if (mounted) {
          setVisible(available && choice === null);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setVisible(available);
          setReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, [analytics, available]);
  const showPreferences = useCallback(() => setVisible(true), []);
  const choose = async (choice: AnalyticsConsent) => {
    setBusy(true);
    setError(false);
    setReady(false);
    try {
      await analytics.setConsent(choice);
      setVisible(false);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
      setReady(true);
    }
  };
  return (
    <AnalyticsContext.Provider value={{ analytics, ready, showPreferences }}>
      {children}
      {visible && available && (
        <section
          aria-label="Preferencias de analítica"
          style={{
            position: "fixed",
            bottom: 68,
            left: 12,
            right: 12,
            zIndex: 50000,
            maxWidth: 520,
            margin: "auto",
            padding: 16,
            borderRadius: 12,
            background: "var(--ion-background-color)",
            color: "var(--ion-text-color)",
            border: "1px solid var(--ion-color-medium)",
          }}
        >
          <strong>Ayúdanos a mejorar DeaMap</strong>
          <p>
            ¿Permites medir cómo llegas y qué funciones utilizas con Google Analytics? No enviamos
            direcciones, búsquedas ni ubicación precisa. Puedes usar el mapa sin aceptar.
          </p>
          <a href="https://deamap.es/legal/privacidad" target="_blank" rel="noreferrer">
            Más información
          </a>
          {error && (
            <p role="alert">
              No se ha podido guardar la elección. La analítica sigue desactivada; puedes intentarlo
              de nuevo.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void choose("denied")}
              style={{ padding: "10px 14px" }}
            >
              No aceptar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void choose("granted")}
              style={{ padding: "10px 14px" }}
            >
              Aceptar analítica
            </button>
          </div>
        </section>
      )}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("AnalyticsProvider is required");
  return context;
}
