# Courier aéreo V1 — implementación para revisión

Repositorio canónico: AlanTN13/Cotizador_gt. Deployment inspeccionado: cotizador-gt, dominio cotizador.globaltriplog.com, main 186de9c91ae0b8835e9135b9bb7b3217afe214f7. Se conserva la aplicación Next.js y su identidad; no se reconstruye desde el prototipo de Sites.

## Flujo

Formulario de productos/links y bultos → API privada del servidor → consulta de idempotencia → lectura segura del link + interpretación estructurada OpenAI → catálogo versionado aprobado → aptitud → cálculo decimal determinístico → registro confirmado → respuesta.

Una solicitud finalizada queda COTIZADO, REQUIERE_REVISION o NO_APTO_COURIER. No se muestra éxito si el registro no confirma persistencia. El equipo de revisión se identifica como `cotizaciones`; no depende de una persona. La identidad del owner funcional de las reglas es Germán Jiménez.

## Cobertura efectiva inicial

- Courier comercial aéreo China → Buenos Aires, mercadería nueva.
- Hasta 10 variantes de producto, 20 grupos de bultos. Cada grupo identifica cantidad de cajas iguales, peso bruto unitario y medidas externas.
- Valor de producto = FOB total de todas sus unidades, sin multiplicarlo nuevamente por cantidad.
- Límite de USD 3.000 FOB por envío y 50 kg brutos por bulto, verificados en fuentes oficiales durante discovery. No se importan reglas de pequeños envíos personales de tres unidades/franquicia USD 400.
- El catálogo operativo se entrega sin perfiles ni tarifas aprobados. **Cobertura automática comercial inicial: cero productos**. Una interpretación de IA no constituye aprobación de una posición o tasa. Los casos operativos se derivan a revisión hasta incorporar datos validados.
- El catálogo de referencia permite verificar la aritmética con productos ficticios. Solo se activa en desarrollo o preview con COURIER_REFERENCE_MODE=true. La API rechaza su activación desde producción aun si el cliente manda reference=true.
- Impuestos internos distintos de cero, origen no confirmado, variantes ambiguas, falta de posición/tasa, configuración vencida o inválida y rangos sin tarifa se derivan a revisión.
- No hay tasa 20% por defecto, ni regla histórica USD 0,80/kg + 1% + 1,2%. No hay modo marítimo.

## Datos que debe validar Germán

1. Tarifario vigente: escalas, mínimo/redondeo, divisor volumétrico, agregación por envío o bulto, manejo y su IVA, seguro, topes, vigencia y fuente. Discovery encontró USD 23/kg + 60 en un prompt, USD 24/17/15/13,5 + 75 en otro documento y USD 24/20/19 en el prototipo; ninguna alternativa se toma como aprobada por inferencia.
2. Primer grupo de variantes cotizables: posición SIM, origen, atributos obligatorios, restricciones/intervenciones/medidas, todos los tributos (incluido cero explícito), fecha de aprobación/vencimiento y fuentes. Los 287 productos históricos no equivalen a 287 clasificaciones validadas.
3. Validación del método de liquidación: distribución de flete/seguro por valor, base imponible, aplicación/tope de tasa estadística, IVA/percepciones. La aritmética de referencia no valida estas reglas para casos reales.

## Operación y seguridad

OPENAI_API_KEY, COURIER_REGISTRY_URL y COURIER_REGISTRY_SECRET solo existen en el servidor. Nunca se envían al frontend ni se versionan. No se envían nombre ni email a OpenAI. Los textos de productos se interpretan como datos no confiables. El modelo solo propone IDs existentes; un ID inventado invalida la clasificación, incluso junto a uno real.

El lector admite HTTPS público, valida DNS, fija la IP validada para evitar rebinding, revalida redirecciones, bloquea rangos privados, limita a 300 KB y 6 segundos. No ejecuta páginas ni inicia sesión en proveedores; un link inaccesible puede requerir descripción/especificaciones.

El registro dedicado de Apps Script verifica HMAC SHA-256, antigüedad, UUID/huella y bloquea concurrentes con LockService. Registra una fila por UUID con huella canónica; un reintento recupera la respuesta ya guardada y un payload distinto con el mismo UUID produce conflicto. Nombre/email se escapan frente a fórmulas de Sheets. La Sheet debe permanecer privada; el endpoint únicamente admite mensajes firmados. No tiene funciones de mail ni usa el receptor del alta de clientes.

El rate limit en memoria es una protección básica por instancia (10/minuto), no un límite global distribuido. Antes de una apertura pública amplia conviene aplicar WAF/rate limit central del proyecto. Apps Script/Sheets limita el volumen de esta primera versión y no ofrece una base transaccional de alto tráfico.

Cada resultado conserva la entrada, interpretación/evidencia, motivos, engineVersion, classifierVersion, catalogVersion, tariffVersion y vigencia. Una respuesta guardada permanece como fotografía del momento: un reintento no recalcula con reglas nuevas.

## Registro de preview

Destino de preview proporcionado por el usuario: [Cotizador Global Trip — Solicitudes](https://docs.google.com/spreadsheets/d/1_urrE5nzWxccP2tvqrSWh9QgmRmZFuSaFJBj5fPDRJw/edit?gid=230908#gid=230908). Se preparó la pestaña Solicitudes sin modificar Hoja 1. Receptor dedicado: GlobalTrip — Registro Courier Preview, vinculado a esta hoja y autorizado bajo info@nexopstech.com. Para reproducir la instalación: Cargar `google-apps-script/courier-registry.gs`; configurar las propiedades COURIER_SHEET_ID y COURIER_SECRET y ejecutar setupCourierRegistry. Publicar el receptor ejecutando como la cuenta de integración; el acceso HTTP público se protege dentro del código con firma privada. Guardar URL/secret en Vercel solo para Preview y la rama codex/courier-aereo-v1. Nunca reutilizar los secretos de otra integración.

La pestaña Solicitudes incluye UUID, huella, fecha, estado, equipo, nombre/email, entrada JSON, resultado JSON, entorno y un resumen legible de productos, FOB, bultos, total del servicio y motivos. Todo registro originado en preview se marca PRUEBA, incluso si no usa el catálogo sintético. Filtrar REQUIERE_REVISION forma la cola funcional inicial; gestionar notas/asignación en columnas adicionales sin alterar UUID, huella ni JSON originales.

## Verificación

`npm test`: motor, contrato del clasificador, idempotencia/errores de servicio, seguridad de links y ejecución del código real de Apps Script en un simulador de servicios de Google.

`COURIER_LIVE_TEST=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/classifier.test.ts`: prueba optativa con proveedor real y descripción sintética. El resto de tests nunca necesita secretos ni acceso externo.

`npm run build` y `npx tsc --noEmit`: build y tipado. La dependencia Next.js heredada 14.2.5 se actualiza a 15.5.24 y React 19; PostCSS se fija por override a una versión corregida. No hay uso de APIs de Next modificadas por la migración que requiera codemods.

Actualización de integración (2026-09-08): el usuario proporcionó una clave de otra cuenta mediante el portapapeles. Se reemplazó en .env.local (ignorado por Git) y se configuró OPENAI_API_KEY como Secret de Vercel exclusivamente en Preview para codex/courier-aereo-v1. La prueba real de interpretación con gpt-4.1-mini pasó: 5/5 pruebas del archivo classifier.test.ts, incluida la optativa contra OpenAI. Se verificó identificación no vacía y ausencia de IDs inventados frente al catálogo operativo vacío. El rechazo de saldo de la cuenta anterior quedó resuelto con la nueva clave. El usuario autorizó expresamente el permiso de Google Sheets del receptor el 2026-09-08. Se configuraron URL y firma privada exclusivamente en el Preview de la rama; la verificación de persistencia real se documenta por separado.

## Fuentes funcionales y normativas

- https://www.arca.gob.ar/envios-internacionales/courier/conceptos-generales/conceptos-generales.asp
- https://www.argentina.gob.ar/normativa/nacional/norma-406708/actualizacion
- Hoja histórica: 1MhZ8E73lZAqFjFIKpTVNftb9bhyneIJi3wMxSVTlG5g; documento de tarifario: 1v3AXSptxcnqH0P1M2trTf0gnJsWLCRstYG5JgnOV-PM. Sus datos no se incorporan como aprobaciones.
