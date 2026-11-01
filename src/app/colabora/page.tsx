import { ArrowDown, ArrowUpRight, Check, MapPin, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { AppDownloadSection } from "@/components/AppDownloadBanner";
import CollaborationResources, { CollaborationVideo } from "@/components/CollaborationResources";
import { safeJsonLd } from "@/lib/json-ld";

const title = "Añadir y actualizar desfibriladores (DEA) en el mapa";
const description =
  "Añade un desfibrilador que falte en DeaMap, descubre cómo actualizar sus datos y comparte vídeos y materiales para dar a conocer el mapa de DEA.";
const media = "/colabora/2026-11";
const questions = [
  {
    question: "¿Cómo puedo añadir un desfibrilador al mapa?",
    answer:
      "Comprueba primero que no figure ya en DeaMap. Abre el formulario Agregar DEA, indica el lugar, la ubicación y los datos de acceso que conozcas. Puedes hacer la aportación desde la web sin cuenta. En la app necesitas iniciar sesión. Las altas se revisan antes de publicarse.",
  },
  {
    question: "¿Puedo editar cualquier ficha de un DEA?",
    answer:
      "La edición de fichas desde la web está disponible para gestores y verificadores con los permisos correspondientes. Si no tienes permisos, consulta la ficha y contacta con el equipo para indicar qué dato conviene revisar. No crees otro DEA para corregir uno existente.",
  },
  {
    question: "¿Qué información es útil aportar o revisar?",
    answer:
      "La posición, el nombre del lugar, la entrada correcta, la planta, los horarios y las condiciones de acceso. Si aportas fotografías, evita mostrar rostros y datos personales. Indica solo lo que hayas podido comprobar; no supongas que un equipo está disponible las 24 horas.",
  },
  {
    question: "¿Puedo compartir los vídeos y el kit en mis redes?",
    answer:
      "Sí, puedes compartir los materiales para dar a conocer DeaMap. El kit incluye vídeos, subtítulos, textos, QR y cartel. Las grabaciones utilizan las interfaces reales con datos de demostración, locución sintética y música original; no representan una emergencia ni garantizan el acceso a los equipos.",
  },
];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/colabora" },
  openGraph: {
    title,
    description,
    url: "/colabora",
    images: [
      {
        url: `${media}/06-portada.png`,
        width: 1920,
        height: 1080,
        alt: "DeaMap: encuentra, añade y actualiza",
      },
    ],
  },
  twitter: { card: "summary_large_image", title, description, images: [`${media}/06-portada.png`] },
};

export default function CollaboratePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "DeaMap", item: "https://deamap.es" },
          {
            "@type": "ListItem",
            position: 2,
            name: "Colabora",
            item: "https://deamap.es/colabora",
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: questions.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
      {
        "@type": "VideoObject",
        name: "DeaMap: encuentra, añade y actualiza",
        description:
          "Demostración de las interfaces de DeaMap para consultar el mapa, aportar nuevos DEA y actualizar fichas desde la web con permisos. Datos de demostración.",
        thumbnailUrl: `https://deamap.es${media}/06-portada.png`,
        contentUrl: `https://deamap.es${media}/01-video-horizontal.mp4`,
        uploadDate: "2026-11-01",
        duration: "PT20S",
        inLanguage: "es",
        publisher: {
          "@type": "Organization",
          name: "Global Emergency",
          url: "https://www.globalemergency.online",
        },
      },
    ],
  };

  return (
    <div className="bg-[#f7f8f1] text-[#102b21]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
      />
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8 sm:pb-24 lg:pt-12">
        <nav aria-label="Ruta de navegación" className="mb-12 text-sm text-[#506653]">
          <Link href="/" className="underline underline-offset-4">
            DeaMap
          </Link>
          <span aria-hidden="true" className="mx-3">
            /
          </span>
          Colabora
        </nav>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-[#247f52]">
              Encuentra. Añade. Actualiza.
            </p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
              El mapa lo
              <br />
              hacemos
              <br />
              <span className="text-[#247f52]">entre todos.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#506653]">
              ¿Conoces un desfibrilador que falta? Añádelo a DeaMap. Si gestionas o verificas
              equipos, ayuda a mantener la información al día.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dea/new-simple"
                className="inline-flex items-center gap-2 rounded-full bg-[#247f52] px-6 py-4 font-bold text-white transition-colors hover:bg-[#17613d]"
              >
                <Plus size={20} aria-hidden="true" /> Añadir un DEA
              </Link>
              <a
                href="#actualizar"
                className="inline-flex items-center gap-2 rounded-full border border-[#bfcdb6] px-6 py-4 font-semibold transition-colors hover:bg-[#e7eddf]"
              >
                Actualizar información <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
            <p className="mt-5 text-sm text-[#506653]">Mapa gratuito · Web · Android · iPhone</p>
          </div>
          <figure className="min-w-0">
            <CollaborationVideo
              file="01-video-horizontal.mp4"
              captions="04-subtitulos.vtt"
              id="horizontal_20"
              label="DeaMap: encuentra, añade y actualiza en 20 segundos"
              poster={`${media}/06-portada.png`}
              className="aspect-video w-full rounded-2xl bg-[#102b21] shadow-xl"
            />
            <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#506653]">
              <span>Así puedes colaborar · 20 segundos</span>
              <a
                href="#compartir"
                className="inline-flex items-center gap-1 font-semibold text-[#17613d] underline underline-offset-4"
              >
                Materiales para redes <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </figcaption>
            <p className="mt-3 text-xs leading-relaxed text-[#64705f]">
              Interfaces reales con datos de demostración. Las altas se revisan antes de publicarse;
              la edición requiere permisos.
            </p>
          </figure>
        </div>
      </section>
      <section id="anadir" className="scroll-mt-20 border-y border-[#d8dfd1] bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[.75fr_1.25fr] lg:py-24">
          <div>
            <Plus className="h-10 w-10 text-[#247f52]" aria-hidden="true" />
            <p className="mt-5 text-sm font-bold uppercase tracking-widest text-[#247f52]">
              01 / Añade un desfibrilador
            </p>
            <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
              Si falta uno,
              <br />
              ponlo en el mapa.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-gray-600">
              Un equipo en tu centro de trabajo, un polideportivo o un local de tu barrio puede ser
              una aportación útil.
            </p>
            <Link
              href="/dea/new-simple"
              className="mt-7 inline-flex items-center gap-2 font-bold text-[#17613d] underline underline-offset-4"
            >
              Abrir el formulario de alta <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div>
            <ol className="divide-y divide-[#d8dfd1]">
              {[
                [
                  "Comprueba que no esté ya",
                  "Busca el lugar en DeaMap antes de añadirlo. Si el equipo existe, evita duplicarlo.",
                ],
                [
                  "Sitúalo y describe el acceso",
                  "Indica el nombre del lugar y su posición. Añade la entrada, la planta, el horario o una foto si conoces esos datos.",
                ],
                [
                  "Envía tu aportación para revisión",
                  "Las altas se revisan antes de publicarse. En la web puedes aportar sin cuenta; en la app necesitas iniciar sesión.",
                ],
              ].map(([heading, body], index) => (
                <li key={heading} className="flex gap-5 py-6 first:pt-0">
                  <span className="text-sm font-bold text-[#247f52]">0{index + 1}</span>
                  <div>
                    <h3 className="text-xl font-bold">{heading}</h3>
                    <p className="mt-2 leading-relaxed text-gray-600">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#17613d] underline underline-offset-4"
            >
              <MapPin size={17} aria-hidden="true" /> Buscar primero en el mapa
            </Link>
          </div>
        </div>
      </section>
      <section
        id="actualizar"
        className="mx-auto grid max-w-7xl scroll-mt-20 gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-24"
      >
        <div>
          <Pencil className="h-9 w-9 text-[#247f52]" aria-hidden="true" />
          <p className="mt-5 text-sm font-bold uppercase tracking-widest text-[#247f52]">
            02 / Actualiza la información
          </p>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
            Una dirección ayuda.
            <br />
            La entrada correcta,
            <br />
            también.
          </h2>
          <p className="mt-6 max-w-xl leading-relaxed text-gray-600">
            El acceso, los horarios y la ubicación pueden cambiar. Los gestores y verificadores
            autorizados pueden actualizar las fichas desde la web, según sus permisos.
          </p>
          <ul className="mt-6 space-y-3 text-gray-700">
            {[
              "Revisa posición, nombre y entrada al edificio.",
              "Comprueba horarios y condiciones de acceso.",
              "Aporta solo información que hayas podido comprobar.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-1 h-4 w-4 shrink-0 text-[#247f52]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-5">
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 font-bold text-[#17613d] underline underline-offset-4"
            >
              Acceso para verificadores <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link
              href="/profile"
              className="font-semibold text-[#17613d] underline underline-offset-4"
            >
              Mi cuenta
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-gray-600">
            ¿No tienes permisos?{" "}
            <a
              href="mailto:info@globalemergency.online?subject=Revisar%20informaci%C3%B3n%20de%20un%20DEA"
              className="font-semibold text-[#17613d] underline underline-offset-4"
            >
              Contacta con el equipo
            </a>{" "}
            indicando el enlace de la ficha y el dato a revisar. Evita incluir información personal.
          </p>
        </div>
        <figure className="rounded-3xl bg-[#e7eddf] p-6 sm:p-10">
          <Image
            src={`${media}/10-edicion-demo.png`}
            alt="Ejemplo del formulario web de edición de un DEA para gestores y verificadores con permisos"
            width={390}
            height={844}
            sizes="(max-width: 768px) 85vw, 360px"
            className="mx-auto h-auto max-h-[520px] w-auto max-w-full rounded-xl border border-[#cdd8c6] object-contain"
          />
          <figcaption className="mt-5 text-center text-xs text-[#506653]">
            Formulario web real · Datos de demostración · Acceso con permisos
          </figcaption>
        </figure>
      </section>
      <section id="compartir" className="scroll-mt-20 border-y border-[#d8dfd1] bg-[#eef1e7]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <p className="text-sm font-bold uppercase tracking-widest text-[#247f52]">
            03 / Comparte el proyecto
          </p>
          <div className="mb-10 mt-4 flex flex-wrap items-end justify-between gap-5">
            <h2 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Un vídeo.
              <br />
              Más gente que puede aportar.
            </h2>
            <p className="max-w-sm leading-relaxed text-[#506653]">
              Vídeos breves, textos y un kit preparado para tus redes, tu asociación o tu próxima
              formación.
            </p>
          </div>
          <CollaborationResources />
          <p className="mt-8 text-xs leading-relaxed text-[#64705f]">
            Los vídeos usan datos de demostración, locución sintética y música original. Son
            materiales de difusión del proyecto, no instrucciones sanitarias ni grabaciones de
            emergencias. Compartirlos no implica el respaldo de ninguna entidad.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8">
        <h2 className="mb-8 text-3xl font-bold tracking-tight">Antes de aportar</h2>
        <div className="divide-y divide-[#d8dfd1]">
          {questions.map(({ question, answer }) => (
            <details key={question} className="group py-5">
              <summary className="cursor-pointer text-lg font-semibold marker:text-[#247f52]">
                {question}
              </summary>
              <p className="mt-4 leading-relaxed text-gray-600">{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <AppDownloadSection />
        <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-[#506653]">
          <strong>Ante una emergencia, llama al 112 y sigue sus indicaciones.</strong> La
          información del mapa puede estar incompleta o cambiar; no garantiza acceso ni
          funcionamiento de los equipos.
        </p>
      </div>
    </div>
  );
}
