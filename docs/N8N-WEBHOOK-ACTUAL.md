# Webhook actual — Preview GlobalTrip

11/09/2026. Preview READY: https://cotizador-5ruelmpsk-alan-fernandezs-projects-f6e1f457.vercel.app/cotizador

Código desplegado: `11639dc`, rama `codex/globaltrip-form-n8n`. Despliegue: `dpl_5z8tqnAgtcScjRReVSWVEw18zkqJ`.

La variable server-side `N8N_COURIER_WEBHOOK_URL` apunta a `https://nexops.app.n8n.cloud/webhook/globaltrip-courier-v1`, únicamente en Preview para esta rama. Se reemplazó la ruta permitida en el gateway para aceptar ese endpoint exacto. Sigue bloqueado `VERCEL_ENV=production`. No se modificaron Header Auth, contrato, formulario, estados, estilos ni configuración de producción. No se modificó n8n.

## Prueba real desde el formulario

Caso enteramente sintético: URL example.com/prueba-sintetica, descripción explícita de prueba de un ventilador doméstico y todos los campos numéricos en 1. No es una compra ni una cotización comercial válida.

Dos envíos desde el navegador, a las 18:45:11 y 18:47:25 UTC (15:45:11 y 15:47:25 Argentina). Ambos conservaron la misma solicitud `6904e229-06f9-4b93-bebd-e368fadaa489` y todos los datos.

- n8n devolvió HTTP 200; logs server-side `authenticated: true` (credencial adjunta).
- La API interna devolvió HTTP 200 y la landing mostró `revision`.
- Mensaje real: “No pudimos completar el análisis. Reintentá en unos minutos.”
- No se recibió estado `cotizado`, importes, SIM ni DIE.

Se valida el recorrido formulario → API interna → webhook n8n → API → landing. La obtención de una cotización completa sigue bloqueada por la respuesta del análisis del workflow.

El mensaje coincide con la rama `AGENTE_NO_DISPONIBLE` de la versión del workflow conservada en `tests/fixtures/n8n-workflow-source.mjs`. Es una correspondencia con el código de referencia, no un diagnóstico confirmado del error interno de la ejecución desplegada. Esa rama incluye errores/rechazos del proveedor, respuesta incompleta o ausencia de output del agente. No se puede distinguir la causa concreta a partir del mensaje público.

Joaco puede localizar ambos intentos por la solicitud y horarios indicados y revisar la salida/error del agente. No se requiere Listen for test event con esta URL permanente.

Evidencia: `evidence/n8n/webhook-live-first-attempt.json` y `webhook-live-retry.json`. Las dos pruebas fueron reales, sin interceptar respuestas.

Verificación local: 86 pruebas aprobadas y 2 omitidas preexistentes; build y TypeScript aprobados. Pruebas de gateway usan la nueva URL y mantienen rechazo de producción y de la antigua Test URL.
