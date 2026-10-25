# Medición de visitas, tiendas y uso de DeaMap

## Qué se mide

La web utiliza la propiedad GA4 existente mediante Google Tag Manager. La app incorpora `@capacitor-firebase/analytics` 8.1.0, compatible con el resto de plugins Firebase y Capacitor 8. No se configura una segunda etiqueta GA4 web.

La analítica se inicia solo tras aceptar. Se puede cambiar la elección en el pie de la web o en Perfil de la app. La publicidad y los identificadores publicitarios se mantienen desactivados. La funcionalidad del mapa no depende del SDK de analítica.

| Evento                                | Plataforma                          | Significado                                                                                                                                                                                                 |
| ------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app_store_click`                     | Web                                 | Clic hacia una tienda; en `/open`, navegación automática a la tienda identificada con `interaction_type=automatic`. No prueba una descarga.                                                                 |
| `first_open`                          | Android/iOS, automático de Firebase | Primera apertura que observa el SDK. No se emite manualmente y no sustituye las descargas de las tiendas; la incorporación del SDK, restauraciones y cambios de consentimiento afectan a su interpretación. |
| `app_first_use`                       | Android/iOS                         | Primer uso medido con consentimiento en los datos locales de la app. Puede corresponder a alguien que ya la tenía instalada antes de actualizar. `measurement_version=1`.                                   |
| `screen_view`                         | Android/iOS                         | Pantalla con nombre fijo: mapa, cercanos, perfil, detalle, añadir, login o registro; sin URL ni ID del DEA.                                                                                                 |
| `map_open`, `nearby_open`, `view_aed` | Android/iOS                         | Acceso a esas funciones.                                                                                                                                                                                    |
| `search`                              | Android/iOS                         | Solicitud explícita de localización desde el mapa; no envía coordenadas ni texto.                                                                                                                           |
| `sign_up`, `login`                    | Android/iOS                         | Operación completada correctamente. No se envían credenciales ni identificadores de cuenta a Analytics.                                                                                                     |
| `campaign_details`                    | App, con consentimiento             | Apertura mediante un enlace que contiene un canal UTM reconocido; no intenta reconstruir una instalación diferida de iPhone.                                                                                |

Los eventos clave nuevos son `app_store_click`, `app_first_use` y `sign_up`. Hay que filtrar por evento para estudiar cada etapa: sumar todos los eventos clave no equivale a contar instalaciones.

## Cómo viaja el canal

Se clasifican canales reconocidos de búsqueda, asistentes, redes sociales, correo, QR y colaboradores. Se descartan textos libres de campañas y URLs de referencia; las campañas de esta implementación usan `deamap_web`. Los dominios y valores desconocidos se agrupan como `other`. Es una atribución de canal, no un emparejamiento individual.

La elección del origen se conserva en la pestaña durante 30 minutos de inactividad, solo tras aceptar. Una campaña UTM explícita nueva la actualiza. Navegar a otra página interna conserva el canal anterior.

**Android:** el enlace de Play incorpora el parámetro `referrer`, con `utm_source`, `utm_medium`, `utm_campaign` y `utm_content` (ubicación del enlace). El SDK nativo de Firebase utiliza la atribución de instalación de Play para los primeros usos de instalaciones compatibles. No se crea una segunda lectura o evento manual de `first_open`.

**iOS:** los enlaces incorporan el token público de proveedor `119094239`, verificado en el generador de campañas de App Store Connect el 25/10/2026. `ct` agrupa el canal, por ejemplo `web_google_organic`. Apple muestra resultados agregados sujetos a sus umbrales; no hay un vínculo individual web → nueva instalación → cuenta de Firebase. Para quienes ya tienen la app instalada, los enlaces pueden registrar una apertura de campaña dentro de la app.

Los enlaces funcionan también sin aceptar, conservando las URLs normales de las tiendas. El esquema Android `deamap://open` es específico y no añade filtros de App Links para `https://deamap.es`, que entrarían en conflicto con el WebView.

## Configuración de la propiedad

Propiedad GA4: `521324373`. Dimensiones de evento: `target_store`, `placement`, `acquisition_source`, `acquisition_medium`, `acquisition_campaign`. Se añadieron estas definiciones sin desactivar los eventos automáticos existentes. Los datos históricos no se reprocesan con las nuevas dimensiones.

Flujos existentes: web `13360193742`, iOS `13787080051`, Android `13787109702`. Los eventos nativos deben llegar a los flujos de app, no al flujo web. No se utilizan claves de Measurement Protocol ni secretos en el cliente.

## Comprobación antes de publicar

1. Web sin elección: no se solicita GTM, Analytics ni Speed Insights. Descargar sigue funcionando. Rechazar no crea enlaces de campaña.
2. Aceptar y entrar con `?utm_source=newsletter&utm_medium=email`. Navegar a `/app` y pulsar Google Play: comprobar `referrer` y un único `app_store_click` en DebugView/tiempo real, con fuente `newsletter`.
3. Pulsar App Store: comprobar `pt=119094239`, `ct=web_newsletter_email` y `mt=8`. Apple necesitará alcanzar sus umbrales para mostrar la campaña.
4. Android: instalar desde una pista de Google Play usando un enlace de prueba, abrir y aceptar la analítica. En Firebase DebugView comprobar el flujo Android, `first_open` automático, `app_first_use`, `screen_view` y `map_open`. Una instalación local de APK no valida Install Referrer de Play.
5. iOS: repetir apertura, consentimiento y navegación con una compilación de TestFlight y DebugView. La atribución agregada de App Store requiere distribución real y volumen suficiente; TestFlight no valida una campaña de descargas de la tienda.
6. Revocar y utilizar el mapa: no deben aparecer nuevos eventos personalizados. Reabrir no debe repetir `app_first_use`. Repetir con almacenamiento/SDK no disponibles: el mapa debe continuar operativo.
7. Verificar que las declaraciones de privacidad de App Store y seguridad de datos de Play reflejan el uso opcional de Analytics (interacciones e identificador de instalación), además de los diagnósticos existentes, antes del envío de 1.0.12.

## Lectura de resultados

Comparar por separado sesiones web, clics a tiendas, adquisiciones de cada tienda y usuarios móviles activos. Usar el mismo periodo y país. Medir `app_first_use` como primer uso observado, no como descarga. Registrar las fechas efectivas de publicación de web y cada tienda. La elección de consentimiento introduce una nueva referencia: los datos posteriores solo representan la audiencia que acepta y no recuperan el histórico que faltaba.

Referencias: [campañas y atribución de apps en Analytics](https://support.google.com/analytics/answer/10311900), [campañas de Apple](https://developer.apple.com/help/app-store-connect-analytics/acquisition/campaign-links), [colección de Analytics](https://firebase.google.com/docs/analytics/configure-data-collection), [plugin nativo](https://capawesome.io/docs/plugins/firebase/analytics/).
