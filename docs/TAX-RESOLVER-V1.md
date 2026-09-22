# Tax Resolver V1 — diseño y execution receipt

## EXECUTION PREFLIGHT — 2026-09-22

- Rol y superficie real: ejecución del resultado explícitamente autorizado en tarea desktop GlobalTrip; clones locales aislados. Workspace-write, red restringida y escalaciones auto-review; no se afirma sesión trusted Alanos ni validación del piloto #32. La orden actual autoriza esta implementación desde esta tarea.
- Resultado/autorización: pedido de Alan del 22/09, Tax Resolver posterior al agente, DIE/TE del PDF de Germán e IVA separado/versionado; PR/receipt, sin merge ni producción.
- Contexto: Alanos HEAD `297e125a624b7bfa61dd1782811d33793a41cf0c`; `AGENTS.md`, `Alan/01_Architecture/Execution_Runtime_Contract.md` (blob `59692943119054d54383d7d8e0cf366ce7eeaef5`), Bootstrap V2, Delivery Team Design, Decision Framework, Capacity Efficiency, Role Contracts, Continuous Knowledge Sync y Receipt Interface. Hogar: `Alan/04_Clientes NexOps/Global_Trip/GlobalTrip_Contexto.md`, delta `02_Meetings/2026-09-15_Delta_Cotizador_Tributos.md`. Corte global `Ultimo_Sync.md`: STALE por otros frentes; no se declara CURRENT global. Cola sin fila Cotizador; concurrencia ajena desconocida.
- Snapshot técnico: `AlanTN13/Cotizador_gt`, PR draft #1, rama `codex/courier-aereo-v1`, base `0e844a904223936050a288a8d7bdfd2b53ec0456`; main `186de9c`. Next 15/React 19/TypeScript/Decimal/Vitest. Agente selecciona perfiles, engine decide y calcula, service persiste idempotentemente, Apps Script guarda resultado completo. Cinco perfiles sin aprobación y tarifa null: cero precios comerciales habilitados.
- Budget M / T2 / R2: cambio funcional referencial reversible, sin cobros ni operación productiva. Riesgo principal: tasas incorrectas o pérdida de fail-closed.
- Dentro: resolver determinístico offline por producto, catálogo arancelario trazable, reglas IVA explícitas, auditoría por línea/revisión y validación representativa.
- Fuera: rehacer agente, reglas Courier/logística, fiscalidad exhaustiva, aprobaciones comerciales, nuevos servicios, merge/deploy productivo.
- Aceptación: 5–10 casos con evidencia PDF, IVA reducido, cero DIE/TE y ambigüedad; regresión multiproducto, límites, registro/idempotencia; typecheck, suite y build.
- Recuperación: revertir commit del resolver en rama draft; no migraciones ni cambios en receptores publicados. Publicar rama/PR es parte del pedido; producción requiere aprobación explícita.
- STOP/BUDGET_RISK: fuente ilegible, clasificación no comprobable o contradicción tributaria → revisión; expansión a liquidación fiscal completa o producción → detener esa expansión.

## Delivery design y capacidad

A1: extensión local del motor mediante resolver puro, posterior a la selección única del perfil y anterior al cálculo. El agente y su contrato no se modifican. Dos fuentes de datos versionadas (DIE/TE y reglas IVA) con coincidencia exacta y metadatos verificables. Sin scraping durante cotizaciones. Cobertura IVA acotada y explícita; no inferir 10,5% por capítulo ni 21% por ausencia de regla. Conservar aprobación/elegibilidad/tarifa como gates independientes.

Una sola superficie de implementación cohesionada, un escritor (Dirección), sin subagentes; pruebas de casos y revisión adversarial separada de la construcción. Capacidad reservada para QA, integración y correcciones. Reutilizar suite y motor de asignación monetaria existentes. Validación focalizada al iterar y suite/typecheck/build centralizados al finalizar. Sin llamadas al modelo de pago ni altas en Sheets reales para probar cambios determinísticos.

La política V1 excluye explícitamente del estimado percepciones, Ganancias e internos. Un tratamiento adicional no nulo/no cero ya conocido exige revisión; null no se convierte en exención fiscal. Importes legacy de conceptos excluidos se conservan por compatibilidad como cero contabilizado, con alcance explícito en resultado/UI. El modo técnico sintético existente conserva su comportamiento y aislamiento de producción.

## Receipt

Estado: **IMPLEMENTADO EN RAMA DRAFT / NO MERGEADO / NO PRODUCTIVO / PENDIENTE VALIDACIÓN DE GERMÁN**.

Delta:
- `resolveTaxes` consulta offline las 32.978 posiciones completas del PDF, con SIM exacto o NCM de ocho dígitos sólo si todos sus hijos tienen tratamiento uniforme y cobertura IVA explícita. SIM inexistente nunca se degrada a NCM. No se consulta ningún sitio durante una cotización.
- DIE/TE prevalecen sobre los valores históricos del perfil. Reglas IVA separadas: cinco SIM originales con 21%; dos NCM tecnológicas explícitamente incluidas en la planilla oficial con 10,5%. No hay regla universal por capítulo o tasa por descarte.
- Fuentes ambiguas, incompletas, fuera de ventana de revisión, tasas inválidas, ausencia/duplicidad de regla o clasificación indeterminada → `REQUIERE_REVISION`, sin total parcial.
- Cada producto guarda posición, tasas y trazas con versión del resolver, versión/hash/documento de fuente, página PDF, regla IVA y fundamento. Las líneas calculadas enlazan a su traza. Las solicitudes en revisión también conservan lo resuelto y motivos. Registro previo a éxito e idempotencia preservados; un replay recupera tasas/versiones originales incluso después de vencer el snapshot.
- Se mantiene agente y catálogo de clasificación actual (cinco perfiles), reglas de elegibilidad, pesos/volumen, reparto monetario y tarifario. No se aprobaron perfiles, no se completó tarifario ni se habilitaron precios comerciales.
- Alcance tributario V1 explícito en respuesta/UI: DIE+TE+IVA. Percepciones/Ganancias/internos excluidos, no declarados exentos; sus campos monetarios legacy permanecen en cero de cómputo. Una tasa adicional conocida no cero o inválida requiere revisión. El modo sintético legacy conserva su aritmética y bloqueo en producción.

### Fuentes y reproducibilidad

- PDF original incluido en `data/tax-sources/ncmsim.pdf`, SHA-256 `38cbf471b591f88f414958a6589c11b783c130e8af6357e56d5e02a66120bf8d`, 1.629 páginas. Recuperado del adjunto local de la conversación referenciada; `/mnt/data/ncmsim.pdf` no existe en este host. El contenido original no se modificó.
- `scripts/import-ncmsim.py` (Python, pypdf 6.10.0) verifica hash, layout y conteo antes de generar `data/tax-die-te.json`. Toma las cinco celdas finales AEC/DIE/TE/RE/DE y selecciona DIE/TE; no confunde decimales presentes en descripciones ni AEC con DIE. Cambiar PDF exige revisar hash/layout/conteo/metadatos, no aceptar silenciosamente otra versión.
- Conteo real: **32.978 SIM únicas, 3.337 TE cero y 29.641 TE 3%**. Corrige la cifra 3.374 del resumen conversacional. Se corroboró de forma independiente leyendo exclusivamente la columna TE por coordenadas con PDFium; los conteos coinciden. Inspección visual: encabezado y páginas 1, 1367; celdas de casos cotejadas con extracción. Datos extraídos no certifican vigencia normativa.
- IVA: [Ley de IVA, texto actualizado, art. 28](https://www.argentina.gob.ar/normativa/nacional/decreto-280-1997-42701/actualizacion), [planilla vigente enlazada desde inciso e)](https://www.argentina.gob.ar/normativa/recurso/42701/texactdto280-1997anexo/htm) y [copia oficial Decreto 820/2007](https://biblioteca.afip.gob.ar/pdfp/ANEXO_DEC820_07.pdf). La copia oficial se conserva con hash en `data/tax-sources/iva-anexo-e-decreto-820-2007.pdf`. Página 2 contiene 8471.30.12 y 8517.62.41; no se utilizó la planilla anterior de 2001 como versión vigente.
- `data/tax-vat.json` guarda fuentes, reglas, fundamento y versión. Su hash identifica el JSON canónico de `{rules, sources}` (claves ordenadas recursivamente, UTF-8, sin espacios). La suite verifica ese hash y el del anexo guardado.
- Ventana técnica de revisión del paquete: 22/09–22/10/2026 (extremo final excluido), parámetro conservador de mantenimiento, **no fecha de vigencia legal certificada**. Ambos documentos conservan `effectiveDate: null`; la fecha normativa del PDF de Germán no está confirmada. Al vencer, solicitudes nuevas van a revisión. Actualizar mediante PR con fuente, versión, vigencia revisada y casos de regresión; nunca mediante scraping en vivo.

### Casos representativos

Los siete primeros verifican resolución sobre fuentes reales. Los dos últimos comprueban revisión. Las pruebas de cálculo usan aprobación y tarifa exclusivamente sintéticas inyectadas en memoria: no son aceptación de Germán ni precio comercial habilitado.

| Caso | Posición | DIE | TE | IVA | Resultado esperado/verificado |
|---|---|---:|---:|---:|---|
| Ventilador de pie | 84145190100R | 20% | 3% | 21% | RESUELTO |
| T-shirt algodón | 61091000190Z | 20% | 3% | 21% | RESUELTO; AEC 35% no se usa |
| Cuchara inoxidable | 82159910130F | 18% | 3% | 21% | RESUELTO |
| Lámpara LED | 85395200900Z | 20% | 3% | 21% | RESUELTO |
| Taza gres | 69120000191F | 20% | 3% | 21% | RESUELTO |
| Notebook, variante de valor/pantalla definida | 84713012991G | 16% | 0% | 10,5% | RESUELTO |
| Router inalámbrico, menos de diez puertos | 85176241100N | 0% | 0% | 10,5% | RESUELTO |
| Smartwatch ambiguo | sin posición única | — | — | — | REQUIERE_REVISION; no se inventa SIM |
| Smartphone, IVA no curado en V1 | 85171300000C | 8% | 0% | sin regla | REQUIERE_REVISION; no fallback21 |

Multiproducto independiente: CIF USD110 por producto; cuchara → DIE19,80 + TE3,30 + IVA27,95; router → DIE0 + TE0 + IVA11,55. Tributos62,60; servicio143,10 con logística sintética. Cap de TE1 afecta sólo la cuchara y mantiene cero en router. Son verificaciones aritméticas, no recomendaciones de cotización.

### Validación y límites

- Suite local: **90 PASS, 2 live SKIP, 0 FAIL**, Node 24.19.0; typecheck y build Next.js aprobados. Reporte en `docs/evidence/tax-resolver-tests.json`. Pruebas nuevas: especificidad SIM/NCM, IVA reducido, cero TE, tasas inválidas, ausencia/conflicto de fuente, snapshot incompleto/vencido, clasificación ambigua, mezcla de tasas, revisión sin total parcial, gates comerciales, persistencia real del código Apps Script en harness y replay inmutable. Se verifican diez trazas dentro del límite actual de la celda de registro.
- El agente de clasificación no cambió. Su cobertura continúa limitada a los cinco perfiles existentes; notebook/router se verifican como entradas ya clasificadas al resolver, **no** como reconocimiento vivo del agente. No se afirma clasificación universal ni extracción de Alibaba.
- No hubo nuevas llamadas OpenAI ni registros en Google Sheets reales. Las dos evaluaciones live existentes quedan omitidas por diseño. No se desplegó Apps Script ni se modificó su código.
- Sin aprobación funcional de Germán, fuente normativa vigente ratificada y tarifario aprobado, sigue sin habilitarse precio comercial. Las reglas IVA cargadas son una curación técnica inicial con cobertura acotada, pendiente de validación funcional; no liquidación fiscal certificada.
- Sin revisión externa independiente ni subagentes: challenge de Dirección con fuentes visuales, segundo extractor independiente y expectativas aritméticas separadas. No afirmar revisión por otra persona.
- Recuperación: revertir el commit de esta entrega sobre la rama draft; sin datos/migraciones ni producción afectados. Un futuro despliegue deberá preservar respuestas ya registradas.

### KNOWLEDGE DELTA

Implementación del resolver terminada y testeada en la rama de PR #1, con cobertura arancelaria del PDF y reglas IVA limitadas. Mantener separados implementación, merge, despliegue y validación de Germán. Registrar evidencia de commit/PR tras publicación; mantener gates comerciales y no afirmar CURRENT global de AlanOS.
