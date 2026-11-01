"use client";

import { Check, Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";

import { useAnalytics } from "@/hooks/useAnalytics";

const assets = "/colabora/2026-11";
const common =
  "Encuentra desfibriladores cerca de ti, añade los que falten y ayuda a mantener la información al día. DeaMap es gratis en web, Android e iPhone.";
const conditions =
  "Las altas se revisan antes de publicarse. En la app necesitas cuenta; la edición de fichas desde la web requiere permisos de gestión o verificación.";
const posts = [
  {
    channel: "Instagram",
    id: "instagram",
    file: "11-instagram.txt",
    text: `¿Conoces un desfibrilador que falta en el mapa?\n\n${common}\n\n${conditions}\n\nDescubre el proyecto y comparte este enlace en tu biografía o historia:\nhttps://deamap.es/colabora?utm_source=instagram&utm_medium=social&utm_campaign=deamap_web\n\nAnte una emergencia, llama al 112.\n\n#DeaMap #Desfibriladores #DEA #Cardioprotección`,
  },
  {
    channel: "LinkedIn",
    id: "linkedin",
    file: "12-linkedin.txt",
    text: `Un mapa de desfibriladores mejora con cada aportación.\n\n${common}\n\n¿Trabajas en un centro deportivo, una empresa o una asociación? Puedes aportar un equipo que falte y consultar qué información existe sobre su acceso. ${conditions}\n\nAquí tienes el mapa, una demostración y materiales para compartir:\nhttps://deamap.es/colabora?utm_source=linkedin&utm_medium=social&utm_campaign=deamap_web\n\nEl mapa no garantiza acceso ni funcionamiento de los equipos. Ante una emergencia, llama al 112.\n\n#DeaMap #Desfibriladores #Cardioprotección`,
  },
  {
    channel: "WhatsApp",
    id: "whatsapp",
    file: "13-whatsapp.txt",
    text: `¿Sabes dónde hay un desfibrilador cerca de ti? Con DeaMap puedes consultar el mapa gratis y aportar los equipos que falten. Las altas se revisan; la edición de fichas requiere permisos.\n\nMapa, apps y vídeos:\nhttps://deamap.es/colabora?utm_source=whatsapp&utm_medium=social&utm_campaign=deamap_web\n\nLa información puede cambiar. Ante una emergencia, llama al 112.`,
  },
];

interface CollaborationVideoProps {
  file: string;
  captions: string;
  label: string;
  id: string;
  className?: string;
  poster?: string;
}

export function CollaborationVideo({
  file,
  captions,
  label,
  id,
  className,
  poster,
}: CollaborationVideoProps) {
  const { trackEvent } = useAnalytics();
  function track(interaction: string) {
    trackEvent({ action: "collaboration_engagement", category: "ui", label: id, interaction });
  }
  return (
    <video
      controls
      playsInline
      preload="none"
      poster={poster}
      className={className}
      aria-label={label}
      onPlay={() => track("play")}
      onEnded={() => track("complete")}
    >
      <source src={`${assets}/${file}`} type="video/mp4" />
      <track kind="captions" src={`${assets}/${captions}`} srcLang="es" label="Español" default />
      Tu navegador no permite reproducir el vídeo.{" "}
      <a href={`${assets}/${file}`}>Descargar demostración</a>.
    </video>
  );
}

export default function CollaborationResources() {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");
  const { trackEvent } = useAnalytics();
  const post = posts[selected];

  function track(interaction: string, label: string) {
    trackEvent({ action: "collaboration_engagement", category: "ui", label, interaction });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(post.text);
      setCopied(true);
      setStatus(`Texto para ${post.channel} copiado.`);
      track("copy", post.id);
    } catch {
      setCopied(false);
      setStatus("No se pudo copiar. Puedes seleccionar el texto o descargarlo.");
    }
  }

  return (
    <div className="space-y-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr_1.15fr]">
        {[
          {
            file: "02-video-vertical.mp4",
            title: "La historia completa",
            duration: "20 segundos · vertical 9:16",
            captions: "04-subtitulos.vtt",
            id: "vertical_20",
          },
          {
            file: "03-anade-dea.mp4",
            title: "¿Falta un DEA?",
            duration: "10 segundos · vertical 9:16",
            captions: "05-subtitulos-corto.vtt",
            id: "vertical_10",
          },
        ].map((video) => (
          <figure key={video.id} className="min-w-0">
            <CollaborationVideo
              file={video.file}
              captions={video.captions}
              label={video.title}
              id={video.id}
              poster={`${assets}/15-vertical-poster.jpg`}
              className="aspect-[9/16] max-h-[540px] w-full rounded-2xl bg-[#102b21]"
            />
            <figcaption className="mt-4">
              <h3 className="text-lg font-bold text-[#102b21]">{video.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{video.duration}</p>
              <a
                download
                href={`${assets}/${video.file}`}
                onClick={() => track("download", video.id)}
                className="mt-3 inline-flex items-center gap-2 font-semibold text-[#17613d] underline underline-offset-4"
              >
                <Download size={17} aria-hidden="true" /> Descargar vídeo
              </a>
            </figcaption>
          </figure>
        ))}
        <div className="flex flex-col justify-between rounded-2xl bg-[#e7eddf] p-7 sm:p-9">
          <div>
            <Share2 className="mb-6 h-8 w-8 text-[#247f52]" aria-hidden="true" />
            <h3 className="text-3xl font-bold leading-tight text-[#102b21]">
              Haz que el mapa llegue a más manos.
            </h3>
            <p className="mt-5 leading-relaxed text-[#3f5846]">
              Comparte los vídeos en tus redes, en el grupo de tu club o al terminar una formación.
              Puedes usarlos para dar a conocer DeaMap, manteniendo el contexto de la demostración.
            </p>
            <ul className="mt-7 space-y-4 text-sm text-[#3f5846]">
              <li>Vídeos verticales y horizontal en 1080p.</li>
              <li>Textos para redes y subtítulos en español.</li>
              <li>Cartel para imprimir, QR e imágenes.</li>
            </ul>
          </div>
          <a
            download
            href={`${assets}/08-kit-deamap.zip`}
            onClick={() => track("download", "public_kit")}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#102b21] px-5 py-4 text-center font-semibold text-white transition-colors hover:bg-[#247f52]"
          >
            <Download size={18} aria-hidden="true" /> Descargar el kit completo
          </a>
        </div>
      </div>
      <div className="grid gap-8 border-t border-[#cdd8c6] pt-10 md:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-[#247f52]">
            Listo para tus redes
          </p>
          <h3 className="mt-3 text-3xl font-bold text-[#102b21]">
            Elige el texto.
            <br />
            Ponle tu voz.
          </h3>
          <p className="mt-4 max-w-md leading-relaxed text-gray-600">
            Copia una propuesta, adáptala a tu comunidad y acompáñala con el vídeo. En Instagram,
            coloca el enlace en tu biografía o usa una historia con enlace.
          </p>
          <a
            download
            href={`${assets}/01-video-horizontal.mp4`}
            onClick={() => track("download", "horizontal_20")}
            className="mt-5 inline-flex items-center gap-2 font-semibold text-[#17613d] underline underline-offset-4"
          >
            <Download size={17} aria-hidden="true" /> Vídeo horizontal · 20 s
          </a>
          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[#17613d]">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(posts[2].text)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("share_intent", "whatsapp")}
              className="underline underline-offset-4"
            >
              Compartir en WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://deamap.es/colabora?utm_source=linkedin&utm_medium=social&utm_campaign=deamap_web")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("share_intent", "linkedin")}
              className="underline underline-offset-4"
            >
              Compartir en LinkedIn
            </a>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir red social">
            {posts.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected === index}
                onClick={() => {
                  setSelected(index);
                  setCopied(false);
                  setStatus("");
                }}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${selected === index ? "border-[#102b21] bg-[#102b21] text-white" : "border-[#cdd8c6] bg-white text-[#102b21] hover:bg-[#e7eddf]"}`}
              >
                {item.channel}
              </button>
            ))}
          </div>
          <div className="mt-4 whitespace-pre-line break-words rounded-2xl border border-[#d8dfd1] bg-white p-6 text-sm leading-relaxed text-gray-700">
            {post.text}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-full bg-[#247f52] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#17613d]"
            >
              {copied ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Copy size={17} aria-hidden="true" />
              )}
              Copiar texto para {post.channel}
            </button>
            <a
              download
              href={`${assets}/${post.file}`}
              onClick={() => track("download_text", post.id)}
              className="text-sm font-semibold text-[#17613d] underline underline-offset-4"
            >
              Descargar texto
            </a>
          </div>
          <p role="status" className="mt-3 min-h-6 text-sm text-[#17613d]">
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
