import { safeJsonLd } from "@/lib/json-ld";

export default function JsonLd() {
  const webApp = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DeaMap",
    url: "https://deamap.es",
    description:
      "Mapa colaborativo para localizar desfibriladores (DEA) por ubicación o dirección en España y otros países.",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    inLanguage: "es",
    author: {
      "@type": "Organization",
      name: "Global Emergency",
      url: "https://www.globalemergency.online",
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webApp) }} />
  );
}
