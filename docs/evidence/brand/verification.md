# Identidad visual GlobalTrip — 11/09/2026

Referencia: sitio público https://globaltriplog.com y componentes Header/Footer de su repositorio `globaltrip-react`, usados como material de consulta (sin modificar el sitio principal).

- Logo oficial y marca NexOps obtenidos directamente del sitio publicado.
- Manrope 400–800 alojada localmente, con licencia OFL incluida.
- Header blanco sticky, tamaños oficiales del logo, navegación reducida y menú móvil.
- Footer con estructura, redes, enlaces, contactos y créditos del sitio. La suscripción abre el sitio principal en otra pestaña, para usar su formulario existente sin agregar lógica de suscripción al cotizador.
- Paleta principal #0b0c49 / hover #161865 / blanco / slate. Campos, botones, bordes y espaciado adaptados a la identidad del sitio.
- Formulario y resultados siguen en la misma pantalla.

Verificación:
- Build Next.js y comprobación TypeScript aprobados.
- 86 pruebas aprobadas; 2 pruebas preexistentes omitidas por requerir servicios externos.
- Comparación AST contra HEAD anterior: estados, controlador de envío y callbacks de eventos idénticos. Ningún cambio en API ni contrato.
- Revisión con navegador a 1280px, 390px y 320px; sin desbordes horizontales.
- Menú móvil abre/cierra; agregar/quitar grupos conserva link y descripción.
- Logo cargado y Manrope aplicada, comprobados en DOM y capturas del navegador.
- No se envió una nueva cotización ni se modificó n8n: tarea exclusivamente visual.
- Trabajo y despliegue limitados a Preview, rama codex/globaltrip-form-n8n.

## Corrección: componentes originales completos

Esta revisión reemplaza el header simplificado y el footer adaptado de la revisión anterior. Se usan Header, Footer y NewsletterSignup originales de `globaltrip-react@5116260`, con ajustes únicamente de plataforma documentados en `components/globaltrip/README.md`.

Comparación con el sitio publicado a 1280px: header 113px, logo 96px, footer 493px; tamaños de texto, pesos, paddings y radios coincidentes en los elementos comparados. Navegación completa, selector de idiomas y formulario de suscripción presentes. Menú móvil a 390px verificado sin desborde horizontal. Cambio ES/EN/ES y validación de email vacío verificados sin enviar una suscripción. Build y 86 pruebas aprobados; dos omisiones preexistentes. Formulario, API y contrato n8n sin cambios.
