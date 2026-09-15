# GlobalTrip V1 — cierre funcional

`workflow-source.mjs` es la fuente de los cuatro Code Nodes y del prompt/esquema del AI Agent nativo. Ejecutar `node workflow/build-workflow.mjs` para regenerar `GlobalTrip-Courier-V1.n8n.json` y `Agente-Despachante.txt`.

## Contrato

Entrada: `{ solicitud_id, productos: [{ link, descripcion }], fob_usd, cantidad, bultos: [{ cantidad, peso_kg, largo_cm, ancho_cm, alto_cm }] }`.

El agente estima cada producto por separado. Si no accede al link, continúa con la descripción. Entrega DIE numérico estimado, clasificación probable si puede y fundamento interno. No hay preguntas ni filtros de aptitud. El Code Node usa el promedio aritmético de los DIE sin redondeo intermedio y las fórmulas aprobadas.

Salida pública: `cotizado` con total, flete internacional, handling con IVA, impuestos y tasas, peso considerado; o `error` técnico. La respuesta de n8n incluye `auditoria` interna con resultados individuales, promedio y cálculo. La API elimina esa información antes de responder al navegador.

## Preview

Importar únicamente en el workflow existente de PREVIEW, conservando las referencias de credenciales Header Auth y OpenAI. El JSON de distribución no incluye credenciales. El backend conserva las variables `N8N_COURIER_WEBHOOK_URL`, `N8N_COURIER_HEADER_NAME` y `N8N_COURIER_WEBHOOK_SECRET`; nunca usar prefijo `NEXT_PUBLIC_`.

La rama `codex/globaltrip-form-n8n` despliega en Vercel Preview. El endpoint rechaza ejecución en Vercel Production. No promover a producción como parte de este cambio.

## Verificación

`npm test` verifica contrato, aislamiento de credenciales y cálculos (incluyendo el JSON literal exportado). Los fixtures son sintéticos y no acreditan clasificación aduanera real. Las ejecuciones reales con uno y dos productos se documentan por separado, sin precargar las respuestas esperadas en el agente.
