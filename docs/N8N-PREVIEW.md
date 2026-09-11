# GlobalTrip — formulario conectado a n8n (preview)

El formulario existente `/cotizador` envía `POST /api/cotizador`; el servidor llama a la Test URL y devuelve los campos permitidos del resultado a la misma pantalla. La portada de la preview abre el cotizador. Se conserva el diseño y los grupos de bultos; V1 recibe un producto por caso. Los campos de contacto se retiraron de este recorrido porque el workflow no los recibe ni registra contactos. La pantalla de referencia anterior conserva su implementación separada.

Preview **READY**: https://cotizador-in6qkwaum-alan-fernandezs-projects-f6e1f457.vercel.app/cotizador (protegida por Vercel; se entregó acceso temporal por separado). Rama publicada: `codex/globaltrip-form-n8n`. El código ejecutable de esta preview corresponde a `7dfbb58`; el commit posterior completa documentación y evidencia.

## Configuración que deben cargar Alan / Joaco

Proyecto Vercel: **cotizador-gt**. Ambiente: **Preview**, rama **codex/globaltrip-form-n8n**.

| Variable server-side | Valor necesario |
|---|---|
| `N8N_COURIER_WEBHOOK_URL` | `https://nexops.app.n8n.cloud/webhook-test/globaltrip-courier-v1` |
| `N8N_COURIER_HEADER_NAME` | El campo **Name** exacto de la credencial Header Auth seleccionada en el nodo Webhook de n8n. No se conoce todavía. |
| `N8N_COURIER_WEBHOOK_SECRET` | El campo **Value** exacto de esa misma credencial. Cargar como Secret en Vercel. No se conoce todavía. |

La variable `N8N_COURIER_WEBHOOK_URL` ya quedó cargada como Secret únicamente en Preview para esta rama. Faltan las otras dos.

Joaco debe verificar la credencial del nodo OpenAI Chat Model dentro de n8n y pulsar **Listen for test event / Execute workflow** antes del envío. Si el listener de prueba atiende una sola ejecución, volver a habilitarlo antes de cada reintento o envío de aclaraciones. No activar producción. Después de cargar las dos variables de autenticación, volver a desplegar esta rama como Preview para que se apliquen.

No colocar estos valores en `NEXT_PUBLIC_*`, el formulario, repositorio, capturas ni mensajes. No hace falta una clave OpenAI en la landing: la conserva n8n. La variable histórica `NEXT_PUBLIC_N8N_WEBHOOK_URL` existe en el proyecto pero no se usa en esta conexión. No se modificó su configuración global.

La API está limitada a la Test URL autorizada y rechaza `VERCEL_ENV=production`. No sigue redirecciones, no hace reintentos automáticos, valida la entrada y la respuesta, y no devuelve errores crudos de n8n. La API ahora exige ambos campos de Header Auth: si falta cualquiera o está vacío, responde `503 N8N_AUTH_CONFIG_INCOMPLETE` antes de llamar al webhook. El formulario conserva los datos. No inventa credenciales. La evidencia del 404 de más abajo corresponde a la prueba anterior a este ajuste.

[Referencia oficial de variables server-side en Next.js 15](https://nextjs.org/docs/15/app/guides/environment-variables).

## Comportamiento verificado

- `cotizado`: total USD, flete internacional, handling con IVA, impuestos/tasas, peso considerado, SIM y DIE. El precio se toma de n8n; no se recalcula en el navegador. Se aclara que no incluye compra de mercadería.
- `falta_info`: entre una y tres preguntas inline con motivo. Conserva producto, grupos de bultos e identificador; acumula `{pregunta, respuesta}` en cada ronda. Escribir una respuesta no oculta las preguntas.
- `revision` y `no_apto`: mensaje del workflow, sin mostrar una cotización anterior.
- Error de red, timeout, autenticación o listener: aviso inline y datos conservados. Un reintento luego de enviar aclaraciones usa el mismo payload sin duplicarlas.
- Los datos se conservan durante la sesión de la pantalla. Recargar/cerrar la pestaña reinicia el formulario. El botón «Empezar otro caso» limpia datos e identificador explícitamente.

## Evidencia

El 11/09/2026 se envió desde el formulario local un caso enteramente sintético: example.com, texto explícito de prueba, todos los valores numéricos en 1. El servidor llamó a la Test URL real y obtuvo **HTTP 404**, registrado como `N8N_TEST_NOT_LISTENING`. La API respondió 503 controlado y la landing conservó todos los datos. Esto acredita el recorrido navegador → API → n8n → API → landing hasta el error del listener; **no acredita una ejecución del agente ni una cotización real**.

La primera propuesta de enviar el ejemplo del ventilador fue rechazada por revisión automática al considerarla datos comerciales. Ese envío no se realizó. El caso completamente sintético fue autorizado y ejecutado como alternativa segura.

- `evidence/n8n/test-real-preview.png` y `live-preview-network.json`: envío real del mismo caso sintético desde la preview de Vercel; mismo error controlado y datos conservados.
- `evidence/n8n/test-real-local.png`: captura con los campos conservados y aviso real.
- `evidence/n8n/browser-simulated.json`: prueba automatizada de interfaz con respuestas simuladas, dos rondas de preguntas y un fallo/reintento.
- `evidence/n8n/simulado-*.png`: capturas explícitamente marcadas como simulación.
- `evidence/n8n/unit-tests.json`: resultados de pruebas locales del proyecto y gateway.
- `tests/n8n-gateway.test.ts`: contrato, filtrado, Header Auth, errores y compatibilidad con funciones literales del workflow.
- `tests/fixtures/n8n-workflow-source.mjs`: copia del código fuente usado para generar el JSON entregado; únicamente fixture, nunca parte del flujo publicado.

**Resultado final:** 84 pruebas locales aprobadas, 0 fallidas y 2 omitidas del conjunto previo por requerir servicios externos. Build local y build de Vercel aprobados. Prueba de navegador simulada completa aprobada. La inspección de `.next/static` no encontró la URL del webhook ni referencias a las variables server-side de esta conexión.

Ejecutar `npm test`, `npm run build`. Con el servidor local en puerto 3018 y `agent-browser` disponible, ejecutar `node tests/browser-n8n.mjs` (o indicar el CLI mediante `AGENT_BROWSER_BIN`). La prueba de navegador intercepta solamente su propio fetch con respuestas ficticias y nunca llama a n8n.

Bloqueos reales para completar la prueba del workflow: listener TEST sin habilitar y nombre/valor de Header Auth todavía no disponibles. El 404 no permite verificar si la credencial importada funciona ni si el agente ejecuta correctamente.
