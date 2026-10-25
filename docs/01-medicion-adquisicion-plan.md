# Medición de adquisición — plan de implementación

**Objetivo:** medir visita web, clic hacia cada tienda, primer uso medido y uso del mapa por canal, respetando la elección de analítica.

**Diseño aprobado:** ampliación de la medición propuesta en el informe de audiencia y autorizada con «Adelante, corrige la medición». Firebase nativo para Android/iOS; Google Play Install Referrer mediante el SDK de Analytics; campañas agregadas de App Store Connect para iOS. No se intenta identificar una misma persona entre dispositivos ni reconstruir instalaciones anteriores.

**Arquitectura:** funciones puras compartidas para canales y enlaces; integración web en un único observador de enlaces; puerto de analítica móvil y adaptador Firebase en el composition root. Se conserva Google Tag Manager y se evita una segunda configuración de GA4 que duplique páginas.

## Pasos

- [x] Añadir pruebas de clasificación de origen, referrer Android, campañas Apple y exclusión de parámetros personales.
- [x] Implementar enlaces y eventos de descarga en todos los puntos de entrada, incluido `/open`.
- [x] Añadir elección de analítica web y móvil, desactivada por defecto y modificable; publicidad desactivada.
- [x] Integrar Firebase Analytics nativo en ambas plataformas, registrar pantallas y primer uso medido sin nombres de DEA, direcciones, coordenadas, correos ni búsquedas libres.
- [x] Sincronizar proyectos nativos, incrementar versiones y documentar eventos, dimensiones, límites y comprobación en dispositivo.
- [x] Ejecutar pruebas, lint y builds obligatorios; revisar el cambio y preparar PR con evidencia.

## Verificación local

25/10/2026: 682 pruebas unitarias web, 60 móviles y 11 de integración superadas. Lint web y móvil sin errores; type-check y compilación móvil correctos; compilación Next.js completada. El build local de Windows presenta avisos al copiar tres archivos externos al paquete standalone; la compilación Linux de CI debe verificar ese entorno.

Comprobado en navegador con una compilación de producción local: sin elección no carga GTM; al aceptar, los clics incorporan `newsletter/email` a Google Play y `web_newsletter_email` a Apple; al revocar, se eliminan ambos parámetros y GTM deja de cargarse. Revisión de código sin hallazgos importantes pendientes.

Pendiente de validación en dispositivo: DebugView y atribución de una instalación desde Play/TestFlight, además de privacidad de las tiendas antes de distribuir 1.0.12.

## Comprobaciones críticas

- Rechazar o revocar la analítica impide nuevos eventos y nuevos enlaces de atribución.
- Visitar una ruta interna conserva el origen de la sesión; una campaña explícita nueva lo actualiza.
- No se reenvían URLs completas, consultas, identificadores publicitarios ni datos de usuarios a las tiendas.
- El clic web es un clic; `first_open` lo emite Firebase; `app_first_use` significa primer uso medido con consentimiento, también en usuarios existentes tras actualizar.
- Apple requiere token de proveedor y umbrales mínimos; no se promete atribución individual de nuevas instalaciones iOS.
- Un fallo de medición o almacenamiento no impide abrir el mapa ni descargar la app.

## Publicación

Web 2.0.2 y móvil 1.0.12. El cambio móvil requiere instalar la nueva compilación y validar Firebase DebugView en Android e iOS. La aprobación de la publicación anterior no se reutiliza para omitir revisiones de esta PR.
