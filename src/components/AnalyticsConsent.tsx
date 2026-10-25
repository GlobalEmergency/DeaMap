"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import {
  readAnalyticsConsent,
  saveAnalyticsConsent,
  type AnalyticsConsent as ConsentChoice,
} from "@/lib/analytics-consent";

export default function AnalyticsConsent() {
  const [visible, setVisible] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    setVisible(readAnalyticsConsent() === null);
    setAllowed(readAnalyticsConsent() === "granted");
  }, []);
  const choose = (choice: ConsentChoice) => {
    const previous = readAnalyticsConsent();
    const persisted = saveAnalyticsConsent(choice);
    setVisible(!persisted);
    setStorageError(!persisted);
    setAllowed(choice === "granted");
    if (previous === "granted" && choice === "denied" && persisted) window.location.reload();
  };
  return (
    <>
      {allowed && (
        <>
          <Analytics
            beforeSend={(event) => (readAnalyticsConsent() === "granted" ? event : null)}
          />
          <SpeedInsights
            beforeSend={(event) => (readAnalyticsConsent() === "granted" ? event : null)}
          />
        </>
      )}
      <button
        type="button"
        onClick={() => setVisible(true)}
        className="block mx-auto my-3 text-xs text-gray-600 underline"
      >
        Preferencias de analítica
      </button>
      {visible && (
        <section
          aria-label="Preferencias de analítica"
          className="fixed bottom-3 left-3 right-3 z-[2200] mx-auto max-w-xl rounded-xl border border-gray-300 bg-white p-4 text-sm text-gray-800 shadow-sm"
        >
          <p className="font-semibold">Ayúdanos a mejorar DeaMap</p>
          {storageError && (
            <p role="status">
              Tu elección se aplica a esta página, pero el navegador no permite guardarla para
              próximas visitas.
            </p>
          )}
          <p className="mt-1">
            Con tu permiso, usamos Google Analytics para saber cómo llegas y qué funciones se
            utilizan. No enviamos direcciones, búsquedas ni tu ubicación precisa. Puedes usar el
            mapa sin aceptar.
          </p>
          <a href="/legal/cookies" className="mt-2 inline-block underline">
            Más información
          </a>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => choose("denied")}
              className="rounded-lg border border-gray-400 px-4 py-2"
            >
              No aceptar
            </button>
            <button
              type="button"
              onClick={() => choose("granted")}
              className="rounded-lg border border-gray-400 px-4 py-2"
            >
              Aceptar analítica
            </button>
          </div>
        </section>
      )}
    </>
  );
}
