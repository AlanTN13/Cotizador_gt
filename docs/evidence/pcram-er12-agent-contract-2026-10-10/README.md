# ER12 — cadena PCRAM y candidato acotado

Estado de cierre operativo: **BLOQUEO_MATERIAL_ESPECÍFICO**. La integración no se declara resuelta.

## Preflight / PATCH MODE

- Owner: Dirección de Ejecución, un agente. Autorización: ER12, preparar/implementar localmente una corrección demostrada; sin publicación o ejecuciones comerciales.
- Contexto: AlanOS `9b9375b`, contrato de ejecución, GlobalTrip_Contexto y QA_Camiseta_DIE_2026-10-10. Superficie M/T2/R2 por clasificación tributaria y gate de instancia compartida.
- Baseline del candidato: export publicado guardado `7739824e-8248-4e7e-8534-72a96d7004d0`, 12 nodos. Las tres ejecuciones leídas apuntan a esa versión en Autosave. No se realizó un GET API fresco: no había clave autorizada utilizable en portapapeles. La sesión autenticada existente permitió toda la lectura de las trazas sin crear accesos.
- Delta: **un campo**, `Agente Despachante.parameters.options.systemMessage`. Implementado en artefacto aplicable/rollback en rama, sin mutaciones Cloud. No se cambió la función de búsqueda porque valida correctamente el contrato efectivo que el agente incumplió.
- Congelados: todos los demás campos, nodos/conexiones/settings/modelo/Web Search/credenciales, índice, fuentes, guardia, Tax Resolver incluyendo estimador familiar ER11, TE/IVA, China/Germán, web/gateway y otros clientes.
- Checks: reproducción de siete queries reales; envoltura Agent V3 → guardia literal → calculador literal; auditorías reales de las tres operaciones; negativos de procedencia; integridad y rollback de un campo. No prueba de comportamiento nuevo de la IA.
- Smoke máximo: un E2E real no productivo autorizado. **No ejecutado**: canal ausente/no habilitado. No nuevo workflow, proveedor, servicio, credencial ni llamada IA.
- STOP: resultado local documentado y bloqueo del E2E acreditado; gate de publicación sigue cerrado.

## Primera frontera demostrada

| Run real | Consulta | Agente → guardia | Procedencia del DIE |
|---|---|---|---|
| [34451](https://nexops.app.n8n.cloud/workflow/LO9m0AxSrxRR6JVY/executions/34451), 11:44:41 AR | `('', 'camiseta running')` NO_MATCH; `('6109','camiseta')` OK, 10 coincidencias / 4 devueltas / partial | NCM61091000 / SIMnull, conservado. Fundamento declara composición desconocida. **La elección de algodón no queda sustentada**, aunque el código exista. | Lookup NCM en snapshot, 4 SIM algodón uniformes20%; IVA GENERAL_RULE. Total931,88. |
| [34452](https://nexops.app.n8n.cloud/workflow/LO9m0AxSrxRR6JVY/executions/34452), 11:48:19 AR | Smartwatch: 8517 + smartwatch NO_MATCH; reintento **11 términos** INVALID_QUERY. Juguete: 9503 + **9 términos** INVALID_QUERY. Máximo efectivo8. | Ambos códigosnull desde la salida original. Guardia conserva; no borró posiciones. | AGENT_ESTIMATE16/20, TE3/IVA21 GENERAL_RULE, sin dutyEvidence. Total1146,92. |
| [34453](https://nexops.app.n8n.cloud/workflow/LO9m0AxSrxRR6JVY/executions/34453), 11:52:32 AR | 6109 + camiseta running NO_MATCH; 6109 + texto vacío OK, 10 / 4 / partial | HS6109 / SIMnull, conservado; composición desconocida explícita. | FAMILY_SNAPSHOT20, cobertura10/10; TE3/IVA21 estimados generales. Total931,88. |

La primera degradación en el caso doble está **en los argumentos que construye el agente**, antes de recuperar candidatos. Son cuatro campos correctos; no se repite el antiguo defecto de contexto n8n/Agent V3. `terms.length > 8` reproduce exactamente ambos INVALID_QUERY, y quitar sólo ese exceso en un control local cambia el estado a NO_MATCH (no acredita correspondencia). La guardia y el cotizador interpretan las envolturas válidas correctamente y preservan lo recibido.

La otra degradación está **en la selección del agente** en34451: NCM61091000 significa algodón en el propio contexto devuelto. El agente confunde una condición que distingue NCM8 con una limitación sólo del SIM. La guardia existente controla pertenencia y procedencia, **no demuestra atributos semánticos**. No es una pérdida de código ni un fallo del lookup de impuestos. En34453 la clasificación parcial y estimación familiar son explícitas y coherentes; la ausencia visual de NCM8 no es un error técnico por sí sola.

## Evidencia y límites de lectura

`executions.selected.json` transcribe campos seleccionados de las trazas UI autenticadas (no exportAPI crudo): inputs originales que recibió el agente, consultas exactas, estados, códigos/contextos, fuentes/SHA, clasificaciones/fundamentos y auditorías. Las observaciones reales se decodificaron desde `[{response: JSON_string}]`; los siete estados y candidatos se reprodujeron con el Code Tool literal de esa misma versión. Los originales continúan en los enlaces de ejecución.

En34452 `agent_input` contiene completos los dos enlaces de Alibaba y descripciones con índices1/2; inputs del validador conservan esos productos. El agente afirma «Ficha del producto recibida», pero las trazas seleccionadas no incluyen un registro independiente de apertura HTTP/atributos de Alibaba. No se certifica ese acceso ni composición por nombre en URL. No se abrió Alibaba ni se hizo una consulta web nueva. Tampoco se afirma una llamada online a PCRAM: índice local ZIP4cd912aa… y snapshot tributario separado fd04e234….

## Parche preparado — una frontera: instrucciones de consulta/selección del agente

`apply.patch.json` implementa tres sustituciones puntuales dentro del **mismo systemMessage**:

1. Expone el contrato real (8 términos distintos, mínimo3 caracteres, 160 caracteres, indice1–100/limite1–8), conjunción AND; consultas de1–3 términos genéricos verificables sin listas de sinónimos/traducciones. No elimina atributos del producto para seleccionar una posición.
2. Si NO_MATCH con prefijo ya sustentado, el único reintento conserva ese prefijo y usa texto vacío. Conserva presupuesto máximo2 consultas, prohibición de reintento por errores y prudencia de clasificación.
3. NCM8 también exige justificar atributos que distinguen la apertura, aun con SIMnull; si el propio fundamento reconoce que ese atributo falta, conservar únicamente HS4/HS6 independientemente sustentado o null. No recortar ni imponer códigos; partial no representa cobertura completa.

No se añadieron casos de camiseta/smartwatch/juguete ni SIMs/tasas/marcas al prompt. El buscador ya tiene un contrato funcional; ampliar sus límites, truncar términos o hacer un fallback oculto alteraría una frontera que no falló. No se añade un clasificador por expresiones regulares al guardia para interpretar frases de la IA. El criterio semántico sigue a cargo del agente y **requiere prueba real**; este candidato no se presenta como solución funcional certificada.

Diff exacto: `prompt.diff` y `manifest.json.changes`. Hash antes `0764c384010bb6bd69b56a8b69bb4ce54209a428f532237be3adb56fb3b912b7`; candidato `90191f1bd5f3e19e6292098fb105c30a52541fc3488e6d29c3f7f0e3bf5d5f1c`.

## Validación local / sin extrapolar a IA

Reproducir: `node scripts/prepare-er12-agent-contract.mjs`, después `node --test tests/er12-agent-contract.test.mjs`. **7 PASS / 0 FAIL** en `local-validation.tap`. Antes de corregir el conteo del test hubo6PASS/1FAIL porque se había contado12 en vez de11 términos; se corrigió sólo esa aserción, no el producto. La causa >8 era correcta y queda reproducida con11/9.

`local-replay.results.json` muestra las tres auditorías reales reproducidas sin tocar cálculo. Las consultas locales de formas válidas `8517+''`, `9503+juguete`, `6109+''` dan OK:62/481/10 coincidencias, respectivamente; cuatro devueltas en cada caso, partialtrue. **Son fixtures directos de la herramienta, no nuevas llamadas del agente ni clasificación**. Sus primeros candidatos son teléfonos, juguetes con ruedas y algodón; no se asignan esos códigos a VALDUS/Chengji/camiseta. Esta parcialidad conserva el límite real de observabilidad/selección y no se esconde tras un OK.

## Bloqueo único del control final

**NO_EXISTING_AUTHORIZED_NONPRODUCTION_AGENT_E2E_CHANNEL.**

La carpeta Global Trip en la sesión n8n existente muestra el Courier V1 publicado y workflows operativos anteriores (APROBADOR/COTIZADOR/PENDIENTES), ninguno identificado/autorizado como canal aislado de QA del agente candidato. No se abrió ni utilizó ninguno de esos otros workflows. El paquete previo `nomenclator-browser-qa-prepared-2026-10-08/authorization.json` acredita que el canal de QA quedó pendiente/no habilitado, y AlanOS posterior eligió un único workflow habitual para QA productiva expresamente autorizada. ER12 no autoriza editar ni usar producción como laboratorio, ni crear una copia. La ejecución manual en ese workflow no es un entorno separado.

El entorno local tampoco tiene `OPENAI_API_KEY` configurada ni un runtime autenticado equivalente al Agente Despachante actual; las credenciales configuradas en n8n no se extraen ni se copian. El test live anterior del repositorio usa otro clasificador/modelo y no acreditaría este agente. La falta de clave API n8n **no bloqueó** el diagnóstico (se leyó la sesión); no se presenta como causa de fallo del sistema ni se propone crear credenciales.

Por tanto el único E2E real requerido no puede ejecutarse respetando el alcance. No se abren caminos alternativos. Pendiente: un canal y autorización puntual que permitan probar **este agente/configuración + herramienta + guardia + calculador** fuera de producción; no es permiso solicitado para publicar este candidato. Hasta ese gate, **no hay corrección funcional validada ni PASS integral**.

## Recuperación e integridad

12 nodos/configuración del candidato iguales al export guardado salvo `/nodes/4/parameters/options/systemMessage`. Todos los nodos restantes y conexiones/settings idénticos; cálculo SHA2530f19f… intacto. No cambios n8n, ni cotizaciones ni llamadas IA ni downloadsPCRAM durante esta ejecución. No se afirma haber comparado byte-for-byte un nuevo GET completo del workflow activo; el checksum es del baseline guardado y el candidato local.

Rollback exclusivo: `rollback.patch.json` + `prompt.before.txt`. Si alguna vez se autoriza aplicación: releer identidad/versión/hash vivo y congelados, STOP ante divergencia; aplicar sólo ese campo, verificar borrador y activar sólo con gate explícito. No restaurar workflow completo. Hoy no hay mutación productiva que deshacer.

Fases: `LOCAL_PREPARADO=SI`; `VALIDADO_E2E_NO_PRODUCTIVO=NO/BLOQUEADO`; `PUBLICADO=NO`; `QA_CLIENTE=nuevas pruebas NO`; las tres QA previas permanecen como evidencia, no aceptación del candidato. STOP.
