# Diagnóstico read-only #34375 — camiseta USD 931,88

Ejecución real del 09/10/2026 12:49:43 Argentina, 16,694 s, versión `6028105a-7aba-45ca-88a6-4d60c27a3cf4`. Lectura exclusiva de las trazas guardadas en la sesión autenticada de Alan. No se ejecutaron cotizaciones, código del workflow, tests ni llamadas IA; no se modificó n8n.

## Resultado demostrado

La herramienta fue invocada **dos veces**. Los cuatro parámetros visibles fueron:

1. `{indice:1,prefijo:"61",texto:"camiseta running",limite:5}`.
2. `{indice:1,prefijo:"",texto:"camiseta running camiseta deportiva camiseta de correr polyester algodón",limite:5}`.

Ambas devolvieron **INVALID_QUERY**, `results:[]`, `partial:false`; no fueron OK ni NO_MATCH. La primera figura Success in 200ms: ausencia de excepción del nodo no equivale a búsqueda válida. No reaparece el error de JSON Schema por additional properties de #34366. El Code Tool llega a emitir su respuesta de rechazo interno con metadata del índice local. No hubo consulta en vivo a PCRAM.

`intermediateSteps` conserva `action.tool`, `action.toolInput` y la observación string con envoltura `[{response: JSON_string}]`. Fuente SHA `4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c`, schema `pcram-nomenclator-fixed-2134-v1`.

El agente devolvió HS parcial `6109`, SIM null y DIE 20 estimado. Su evidencia describe la búsqueda como resultados vacíos; esa explicación es incompleta: la respuesta real fue INVALID_QUERY, no búsqueda válida sin coincidencias.

El validador terminó sin error (71ms), recibió ambas observaciones y conservó exactamente HS 6109 / SIM null / DIE 20; `siguiente:cotizar`. No había una posición completa que pudiera descartar. Esta salida es compatible con mantener clasificación parcial y no aceptar candidatos provenientes de INVALID_QUERY. **No demuestra que el guard normalizara positivamente una respuesta exitosa**: no hay OK/NO_MATCH ni trazas internas de sus ramas en este run.

El calculador confirma FOB 500 / total 931,88, peso 29 kg. Tax Resolver: ESTIMADO, requestedPosition/ncm/sim null, dutyEvidence/vatEvidence null; DIE por estimación del agente, TE/IVA generales estimativos. No tratamiento específico PCRAM para esta camiseta.

## Conclusión y límite

**La integración de consulta continúa fallando en Cloud**, dentro de la respuesta de `Consulta_nomenclador_PCRAM`: rechaza ambas consultas como INVALID_QUERY. La traza prueba llamada y retorno de la herramienta, pero no una búsqueda útil ni validación positiva de candidatos. No permite identificar el tipo/representación interno de `query` ni la condición precisa de la proyección/buscador que rechazó la entrada. No adjudicarlo a falta de resultados o de atributos del producto. No se propone ni implementa cambio en este diagnóstico.

Archivos de evidencia: input/output de ambas consultas, output original del agente, input/output del validador, output del calculador, identidad/version y screenshot de la primera llamada. Son textos de UI observada, no exports reconstruidos del runtime. Sin headers ni credenciales. Manifest SHA-256 permite verificar integridad. STOP.
