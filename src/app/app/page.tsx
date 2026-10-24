import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AppDownloadSection } from "@/components/AppDownloadBanner";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-stores";
import { safeJsonLd } from "@/lib/json-ld";

const title = "App de desfibriladores para Android y iPhone";
const description =
  "Descarga DeaMap y localiza desfibriladores (DEA) en España. Busca por GPS, consulta ubicación y horarios disponibles y encuentra cómo llegar.";
const questions = [
  {
    question: "¿Cómo encuentro un desfibrilador cerca de mí?",
    answer:
      "Abre DeaMap y permite el acceso a tu ubicación para buscar DEAs cercanos. Consulta la ficha del equipo y las indicaciones para llegar. También puedes buscar por dirección en la web.",
  },
  {
    question: "¿Puedo consultar el mapa sin instalar la app?",
    answer:
      "Sí. El mapa de deamap.es permite buscar desfibriladores desde el navegador, sin instalar la aplicación ni crear una cuenta para consultar el mapa.",
  },
  {
    question: "¿Todos los desfibriladores están disponibles las 24 horas?",
    answer:
      "No. El acceso depende del lugar y del horario de cada equipo. Consulta los datos disponibles en la ficha. La cobertura, la ubicación y la disponibilidad pueden estar incompletas o cambiar.",
  },
];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/app" },
  openGraph: { title, description, url: "/app", images: ["/og-image.png"] },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  itunes: { appId: "6760004634", appArgument: "https://deamap.es/app" },
};

export default function AppPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MobileApplication",
        "@id": "https://deamap.es/app#application",
        name: "DeaMap",
        url: "https://deamap.es/app",
        description,
        applicationCategory: "HealthApplication",
        operatingSystem: "Android, iOS",
        installUrl: [APP_STORE_URL, PLAY_STORE_URL],
        sameAs: [APP_STORE_URL, PLAY_STORE_URL],
        image: "https://deamap.es/app-store/screenshot-01-mapa.png",
        publisher: {
          "@type": "Organization",
          name: "Global Emergency",
          url: "https://www.globalemergency.online",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: questions.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };

  return (
    <div className="bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
      <section className="max-w-5xl mx-auto px-4 py-12 md:py-20">
        <Link href="/" className="text-blue-700 underline underline-offset-4">
          DeaMap · Mapa de desfibriladores
        </Link>
        <div className="grid gap-10 md:grid-cols-2 items-center mt-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              Desfibriladores cerca de ti, también en tu móvil
            </h1>
            <p className="text-lg text-gray-700 mt-6">
              Usa DeaMap como localizador de desfibriladores en Android y iPhone. Localiza DEAs en
              España, consulta los datos disponibles de cada equipo y encuentra indicaciones para
              llegar.
            </p>
            <p className="text-gray-700 mt-4">
              Conoce los desfibriladores de tu barrio, tu trabajo o los lugares que visitas antes de
              necesitarlos.
            </p>
            <Link
              href="#descargar"
              className="inline-block mt-6 px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800"
            >
              Descargar DeaMap
            </Link>
          </div>
          <Image
            src="/app-store/screenshot-01-mapa.png"
            alt="Mapa de desfibriladores en la aplicación DeaMap"
            width={390}
            height={844}
            sizes="(max-width: 768px) 70vw, 260px"
            className="mx-auto w-52 md:w-64 h-auto rounded-3xl shadow-lg"
            priority
          />
        </div>
      </section>
      <div id="descargar" className="scroll-mt-8 px-4">
        <AppDownloadSection />
      </div>
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900">Así encontrarás un desfibrilador</h2>
        <p className="mt-3 mb-8 text-gray-700 max-w-2xl">
          Explora el mapa, compara los DEAs cercanos y consulta su ficha antes de abrir las
          indicaciones. Las imágenes muestran un ejemplo de búsqueda en Madrid.
        </p>
        <video
          controls
          playsInline
          preload="none"
          poster="/app-store/2026-kit/es/02-video-poster.png"
          className="w-full rounded-xl bg-gray-900"
          aria-label="Presentación de DeaMap: mapa, desfibriladores cercanos y datos de acceso"
        >
          <source src="/app-store/2026-kit/es/03-deamap-presentacion.mp4" type="video/mp4" />
          <track
            kind="captions"
            src="/app-store/2026-kit/es/05-presentacion.vtt"
            srcLang="es"
            label="Español"
            default
          />
          Tu navegador no permite reproducir este vídeo.
        </video>
        <div className="grid gap-8 sm:grid-cols-3 mt-10">
          {[
            ["01-map-current.png", "1. Explora el mapa de DEAs"],
            ["02-nearby-current.png", "2. Compara los desfibriladores cercanos"],
            ["03-detail-current.png", "3. Consulta cómo acceder"],
          ].map(([file, caption]) => (
            <figure key={file}>
              <Image
                src={`/app-store/source/${file}`}
                alt={caption}
                width={430}
                height={932}
                sizes="(max-width: 640px) 80vw, 300px"
                className="w-full max-w-72 mx-auto h-auto rounded-2xl border border-gray-200"
              />
              <figcaption className="mt-4 text-gray-800 font-medium text-center">
                {caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Antes de buscar un DEA</h2>
        <div className="space-y-6">
          {questions.map(({ question, answer }) => (
            <div key={question}>
              <h3 className="text-lg font-semibold text-gray-900">{question}</h3>
              <p className="mt-2 text-gray-700">{answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-gray-700">
          Ante una emergencia, llama al{" "}
          <a href="tel:112" className="underline">
            112
          </a>{" "}
          y sigue las indicaciones del servicio de emergencias. DeaMap es una herramienta de
          localización; no garantiza la disponibilidad de los equipos.
        </p>
        <div className="flex flex-wrap gap-6 mt-8 text-blue-700 underline underline-offset-4">
          <Link href="/">Buscar en el mapa web</Link>
          <Link href="/locations/spain">Desfibriladores en España</Link>
          <Link href="/legal/privacidad">Privacidad</Link>
        </div>
      </section>
    </div>
  );
}
