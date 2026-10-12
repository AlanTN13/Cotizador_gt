# PCRAM — vistas completas acotadas, candidato local revisado

**LOCAL_PREPARADO: recorrido determinístico útil en dos consultas por producto; juicio del agente y ejecución real NO verificados.** Este candidato reemplaza al de paginación rechazado. No hubo push, publicación, cotizaciones, llamadas IA, claves ni cambios en AlanOS/issues. El historial del intento anterior está separado en `historical-pagination-rejected/` y no representa el candidato vigente.

## Autorización, aislamiento y PATCH MODE

Copia independiente `Cotizador_gt-local`, rama `codex/pcram-coverage-local`, base `d91415aa7f9dab029e924e19ab1cbb146ff98494`. Se reutilizó la comparación existente, sin repetir la auditoría. Contexto leído: AGENTS del proyecto, Execution_Runtime_Contract, comparación d91415a, cierre ER12 FAIL_ROLLED_BACK 470f65e y AlanOS c6d6187. No existe `.agents/skills` ni AGENTS propio en el checkout. Los cambios ajenos sin commit del original no se trasladaron.

La delegación vigente permite corregir recuperación, instrucciones y correspondencia de consulta/respuesta localmente. Se conserva máximo DOS consultas por producto y maxIterations=8. No se cambió configuración de modelo, topología, índice, fuentes, TaxResolver, FAMILY_SNAPSHOT, fórmulas, logística, gateway/web ni credenciales.

Baseline: export funcional guardado ER11 `7739824e`; receipt ER12 acredita recuperación sólo del prompt a versión `9a87b6f0`. No se leyó producción y no se asume que ese sea su estado vivo actual.

## Contrato mínimo nuevo

Se eliminan offsets, paginación y recortes artificiales del contexto. Se agrega un único campo opcional `vista`:

- `ramas`: todas las NCM coincidentes, contexto NCM literal completo disponible, indicador de campo lleno y cantidad de SIM. `results=[]`: el panorama nunca acredita códigos precisos.
- `detalle`: todas las SIM coincidentes, con descripción/contexto completos disponibles y los límites originales de fuente.
- Cada vista tiene presupuesto fijo de **64 registros / 65.536 bytes UTF-8**. Si supera cualquiera, no muestra las primeras filas: devuelve conjunto vacío, `retrieval.complete=false`, total real y motivo. No afirma cobertura útil ni elige por orden.
- Sin `vista`, respuesta legacy idéntica, incluido `limite=1..8`. Con `vista`, el presupuesto fijo de vista completa reemplaza el límite de filas; `limite` se conserva en la entrada para compatibilidad con el contrato tributario congelado. Esto es explícito en esquema, descripción e instrucciones.
- Los offsets se rechazan incluso si son cero, tanto en adaptador como buscador. No existe estado/cursor que se pueda reutilizar en otro producto.
- `complete` significa cobertura del conjunto de esa consulta y ausencia de recorte agregado por la herramienta. No certifica integridad jurídica del origen ni compatibilidad con el producto. `partial` conserva la semántica histórica sobre filas SIM.

Se elevó el presupuesto de respuesta del intento anterior de 32 KiB a 64 KiB para transportar los contextos completos: el panorama real de 50 ramas de 8517 ocupa 56.933 bytes. Es un cambio de tamaño explícito, no del número de llamadas. No hay catálogos nuevos, rankings, embeddings, heurísticas de clasificación ni códigos de ejemplo en implementación/instrucciones.

## Recorridos completos, sin agente

El ejecutor de pruebas bloquea una tercera llamada por producto. Cada decisión de navegación está registrada en `two-query-routes.json`. La elección de qué descripción inspeccionar es explícita en el fixture: no prueba que el modelo haga esa elección ni inventa atributos de la mercadería real.

| Producto / hipótesis sustentada de familia | Llamada 1 | Llamada 2 | Evidencia accesible |
|---|---|---|---|
| Camiseta / 6109 | ramas, texto vacío | detalle de la misma familia ante composición ausente | 2 ramas, luego 10 SIM; no se fuerza algodón/sintético. |
| Smartwatch / 8517 | ramas, texto vacío | detalle de rama devuelta cuya descripción se inspecciona | 50 ramas, incluida la 38, y ambas SIM de la rama. Condiciones/exclusiones completas de NCM visibles. |
| Juguete / 9503 | ramas, texto vacío | detalle de la rama devuelta de juegos/surtidos y construcción | 15 ramas, luego 18 SIM; controles 11/16 visibles en la segunda llamada. No offsets, tercera llamada ni códigos insertados como entrada de refinamiento. |

Las consultas dirigidas usan el código recuperado de la respuesta, seleccionado por descripción literal para la prueba. Las referencias `85176272900U`, `95030060912G`, `95030060992H` sólo se usan como aserciones de visibilidad después de ejecutar; no determinan el buscador ni se atribuyen a productos reales.

La instrucción evita gastar el primer intento en texto comercial si ya existe un prefijo sustentado. Sin familia sustentada permite un término genérico verificable; no inventa prefijos. Se conserva un caso adverso: `juguete bloques` NO_MATCH y luego detalle9503 excede64. Resultado honesto: cero candidatos precisos, cobertura insuficiente, parcialidad o null según sustento. No se promete resolver todos los casos en dos consultas.

## Validador: cambio acotado a la seguridad del contrato nuevo

Sólo observaciones con el contrato nuevo reciben comprobaciones adicionales; las observaciones legacy conservan comportamiento para evitar refactorización general:

- Igualdad de indice, prefijo, texto, limite y vista entre acción y respuesta. Rechazo de offset, vista incorrecta, conteos incoherentes, parcialidad y respuesta incompleta.
- Código/URI de cada fila corresponde al prefijo y fuente; aislamiento por producto.
- Para acreditar NCM8/SIM, el detalle debe ser dirigido a NCM8 o SIM. Un detalle amplio de familia sirve como evidencia para FAMILY_SNAPSHOT, pero no autoriza un NCM específico.
- Contexto NCM con señal de campo de origen lleno no acredita NCM/SIM. SIM con señal de campo lleno no acredita esa SIM; puede conservar NCM con contexto no marcado. No se reconstruyen textos faltantes.

Esto cierra para el contrato nuevo la confusión de filtros y la acreditación desde un panorama o detalle incompleto. No convierte al guard en clasificador semántico: una rama dirigida incorrectamente elegida con datos suficientes para pasar pertenencia puede seguir siendo incompatible. No se afirma que un indicador `field_full=false` pruebe integridad absoluta del origen.

**Límite real de fuente:** los controles `85176272900U` y `95030060992H` tienen `sim_field_full=true`. Son visibles, pero el candidato no acredita esas SIM definitivas. `95030060912G` no tiene esa señal, aunque sus condiciones de material/peso/producto deben acreditarse aparte. La selección precisa no se fuerza para aprobar ejemplos.

## FAMILY_SNAPSHOT y fórmulas

La ruta camiseta consulta ramas6109 y después detalle6109: devuelve evidencia real de las 10 SIM sin seleccionar composición. Se usa el fixture histórico con HS6109/SIMnull para comprobar el guard y calculador literales del candidato: mantiene FAMILY_SNAPSHOT y USD931,88. El fixture suministra la clasificación parcial; no se presenta como prueba de decisión del modelo.

Archivos tributarios, lib, datos e índices sin diferencias contra d91415a. Fórmulas/calculador idénticos en el workflow; la restauración de los cinco campos reproduce exactamente el export guardado.

## Diff y artefactos

Cinco campos de workflow:

1. `/nodes/11/parameters/jsCode`: incrusta buscador/adaptador nuevos mediante anclas únicas verificadas.
2. `/nodes/11/parameters/inputSchema`: vista opcional y descripción explícita de presupuestos.
3. `/nodes/11/parameters/description`.
4. `/nodes/4/parameters/options/systemMessage`: ruta de dos llamadas y límites de selección.
5. `/nodes/7/parameters/jsCode`: guard del contrato nuevo, sin otro cambio del nodo.

`apply.patch.json`, `rollback.patch.json`, `manifest.json` y `prompt.after.txt` son reproducibles con `node scripts/prepare-pcram-coverage.mjs`. Nunca importar un workflow completo. `source.diff` contiene diff unificado de módulos/preparador/tests contra d91415a; `source.sha256.json` y `artifacts.sha256.json` permiten verificar integridad. `comparison.json` conserva respuesta antes/después; `two-query-routes.json` incluye entradas, decisiones y respuestas de los recorridos completos.

## Pruebas y capacidad

- Node **24.21.0** existente en `/Applications/Codex.app/Contents/Resources/cua_node/bin/node`: **17 pruebas nuevas** (12 de contrato/regresión focalizada, 5 recorridos) y **60 regresiones existentes**, todas aprobadas.
- Node **22.19.0** existente: **74 pruebas de fórmulas/logística** en cuatro suites, vueltas a ejecutar y aprobadas.
- Vitest Node24 mantiene el error de carga del binding nativo/fallback `@rolldown/binding-wasm32-wasi` documentado en esta misma revisión; no se reinstaló nada. No se afirman esas74 pruebas bajo Node24. Los tests Node24 sí ejecutan el calculador literal y FAMILY_SNAPSHOT.
- Cero llamadas de red/IA en pruebas. `git diff --check` limpio. No pruebas live ni nueva cotización.

Mediciones de una muestra local por consulta, no SLA ni memoria pico: panoramas6109/8517/9503 ~25–35ms, 2.041/56.933/9.337 bytes; detalle juguete18SIM ~28ms/19.332bytes; detalle smartwatch2SIM ~27ms/5.274bytes; detalle6109 ~25ms/7.759bytes. Detalle8517 con62SIM excede bytes y devuelve cero filas con motivo; capítulo85 con644 ramas excede registros. Texto muy amplio `los` tarda ~0,5s, ~16MB inflados acumulados, y devuelve negativa explícita de cobertura, no muestra de primeras ramas. Detalles exactos de la última corrida en `measurements.json`.

El índice y tool incrustado siguen en ~2,31MB. El límite de bytes no mide tokens del proveedor: consumo/coste e impacto sobre contexto requieren la prueba real posterior.

## Evaluación de preparación y siguiente gate

Los bloqueos determinísticos del candidato anterior quedaron corregidos: dos llamadas alcanzan los conjuntos útiles de los fixtures, no se omiten contextos por recorte artificial, no hay offsets y el contrato nuevo verifica correspondencia. **Preparado para revisión de una prueba controlada, no para afirmar integración resuelta ni publicar automáticamente.**

Pendiente real: que el agente elija y use las consultas correctas, evalúe condiciones/atributos, respete parcialidad y presupuesto, y que n8n/AgentV3 acepte el esquema y tamaños. Las pruebas locales no acreditan esas decisiones. Si no existe entorno seguro/acceso/presupuesto aprobado, no hay ejecución real.

Plan mínimo condicionado:

- Acceso existente autorizado para leer workflow/trazas y, si corresponde, aplicar/restaurar los cinco campos. Sin crear credenciales ni extraer claves. No verificado aquí.
- Entorno existente seguro con circuito equivalente; no crear infraestructura. Si sólo hay producción, gate separado de canary y riesgo compartido, no heredar ER12.
- Máximo dos ejecuciones técnicas: camiseta y smartwatch+juguete, inputs guardados. Máximo dos consultas PCRAM por producto, seis entre tres productos; maxIterations=8 por ejecución intacto. No asumir que dos E2E o seis consultas equivalen a igual número de llamadas facturadas al modelo: presupuesto monetario/modelo debe autorizarse y medirse.
- Preflight vivo: identidad/12nodos/hashes, superficies congeladas, baseline vigente y backup protegido. Aplicar exclusivamente cinco campos; si baseline divergente, STOP antes de mutar.
- Aceptación: recorrido dentro de dos llamadas, contexto disponible íntegro, fuente/índice correctos, nada de algodón/ruedas sin sustento, SIM marcadas no acreditadas, parcialidad razonada y FAMILY_SNAPSHOT donde corresponda. Los SIM de referencia no son respuestas obligatorias.
- Falla material: STOP, sin tercera ejecución ni ronda adicional. Rollback exclusivo de cinco campos tras lectura fresca que confirme candidato y ausencia de concurrencia; verificar recuperación. Nunca importar workflow completo.
