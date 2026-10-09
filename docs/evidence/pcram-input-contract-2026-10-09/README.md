# PCRAM — parche local del contrato de entrada

**Entrada corregida y preparada; aceptación completa BLOQUEADA / NO-GO para publicación.** No se tocó n8n. No se corrigió la guardia ni se modificó ninguna superficie congelada.

## EXECUTION PREFLIGHT / PATCH MODE

- Rol/superficie: Dirección de Ejecución; frontera de entrada del Code Tool `Consulta_nomenclador_PCRAM` existente.
- Autorización: implementar en rama y validar localmente; publicación y cotizaciones prohibidas.
- Contexto: contrato `Alan/01_Architecture/Execution_Runtime_Contract.md` y contexto GlobalTrip, AlanOS `a3bf1f1a6af59f08c29f23fdc819d57d0725be15`.
- Baseline: export publicado guardado `a4ee337d-4235-4f6b-9d5e-81259c1c2ee8`, 12 nodos; no se afirma preflight vivo nuevo.
- Tamaño S, mantenimiento T1, riesgo local R1; eventual publicación en Pro compartido R2 y gate separado.
- Delta: únicamente `/nodes/11/parameters/inputSchema` y `/nodes/11/parameters/jsCode` (sufijo).
- Congelado: 12 nodos/identidades, conexiones/settings/credenciales, agente/prompt/modelo, validador, índice/decoder/búsqueda, snapshot tributario/IVA, fórmulas Germán/China, web/gateway y otros workflows.
- Validación: reproducción #34366, proyección exacta, estricta validación de cuatro campos, respuestas reales del snapshot, compatibilidad del resultado con guardia, igualdad de congelados y rollback.
- Smoke/Cloud/modelo: cero. Recuperación exclusiva: `rollback.patch.json`.
- STOP: control obligatorio fallido en frontera de observación/guardia, fuera de la superficie autorizada. No ampliar alcance.

## Implementación

`workflow/pcram-tool-input.mjs` valida presencia propia, tipos, enteros, límites y longitudes de **los cuatro campos obligatorios**, sin coerción/defaults. Descarta todo contexto adicional al formar el objeto de búsqueda. Prefijos/formatos/términos siguen siendo validados por la búsqueda congelada.

El esquema acepta contexto adicional (`additionalProperties:true`); las propiedades, rangos, tipos y required siguen idénticos. La proyección impide que contexto u objetos `query`/`rates` adicionales controlen la búsqueda. Relajar sólo el esquema reproduce `INVALID_QUERY`; con el adaptador la función recibe exactamente cuatro claves.

[Diff exacto](diff.exact.txt), [patch con precondiciones](patch.json), [candidato para revisión, NO importar](candidate.workflow.json), [rollback de dos campos](rollback.patch.json). Generación reproducible: `node scripts/prepare-pcram-input-contract.mjs`.

## Controles y límites

Comando ejecutado una vez: `node --test tests/pcram-tool-input-contract.test.mjs`. Resultado real: **8 PASS / 1 FAIL** (9 tests, 16 entradas inválidas y 6 formatos inválidos dentro de los controles). [Log](local-tests.log), [resultados](validation.json).

- Reproduce el rechazo original de `solicitud`, `siguiente`, `agent_input`, `toolCallId` con Zod estricto representativo del conversor oficial. Parámetros exactos de #34366; valores de contexto representativos, no export completo de la entrada Cloud.
- El esquema corregido pasa, la búsqueda recibe sólo cuatro claves, y la consulta exacta de #34366 devuelve **NO_MATCH**. Ya no falla por contrato, pero sus términos no encuentran registros. No se ajustó búsqueda/prompt para obtenerlos.
- Consultas de control a datos existentes: `85176272900U` devuelve 1 candidato; `95030060` + `plastico` y `6109` + `camisetas` devuelven 2 cada una, `partial=true`. Resultados idénticos al motor anterior, con source/version/SHA/descripción/contexto. [Respuestas completas](successful-responses.json). **No son clasificaciones reales del agente ni una prueba VALDUS.**
- Faltantes/tipos/rangos/longitudes/formatos inválidos rechazados; código inexistente NO_MATCH, sin recortar/completar. Guard rechaza SHA/índice de otro producto.
- Los dos campos son las únicas diferencias: 12 nodos y demás JSON idénticos. Índice optimizado, decoder y búsqueda se conservan byte-for-byte; rollback devuelve exactamente el export anterior. Herramienta: 2.301.909 → 2.302.611 bytes (+702).

## Bloqueo obligatorio: respuesta exitosa → guardia

El string JSON directo devuelto por el Code Tool pasa tanto `guardClassification` como el código literal del validador existente. **Eso no basta para acreditar integración Agent V3.**

La reproducción local del camino documentado en [ToolCode.execute](https://raw.githubusercontent.com/n8n-io/n8n/master/packages/@n8n/nodes-langchain/nodes/tools/ToolCode/ToolCode.node.ts) y [buildSteps.buildObservation](https://raw.githubusercontent.com/n8n-io/n8n/master/packages/@n8n/nodes-langchain/utils/agent-execution/buildSteps.ts) construye:

```text
observation = JSON.stringify([{response: <string JSON del resultado válido>}])
```

La guardia congelada hace `JSON.parse(observation)` y busca `result.source.zip_sha256` en el nivel raíz. Obtiene un array, no el resultado contenido en `response`. Primera condición fallida: `result?.source?.zip_sha256 !== sourceSha`. Rechaza una posición válida del fixture porque no registra candidatos consultados. [Envoltura y rechazo](engine-wrapped-success.json). El test obligatorio está **FAIL**, no omitido ni convertido en PASS.

Fuentes oficiales consultadas son `master`, no se certificó identidad con el binario Cloud instalado. Zod local representa su conversión de este esquema; n8n/LangChain no están instalados localmente. Este hallazgo demuestra la incompatibilidad local con el contrato oficial representado, **no una nueva ejecución exitosa en Cloud**. La observación array de errores registrada en #34366 es compatible con ese camino, pero no sustituye una traza exitosa de la versión instalada.

**NO-GO**: no presentar el parche como listo para publicar. La compatibilidad exigida no puede darse por satisfecha cambiando sólo la entrada. Hace falta autorización separada para normalizar la envoltura en la guardia existente si se decide resolver ese bloqueo; no se implementó ni se ensanchó este parche. Conservar prompt/modelo/tasas y el circuito. No proponer infraestructura o nuevas herramientas.

## Hashes / recuperación

Hashes de código y schema en [preparation.json](preparation.json) y [receipt](receipt.json). El parche conserva anchors/hash antes/después; rollback invierte exclusivamente esos dos campos y exige relectura/preflight fresco antes de aplicar en una eventual etapa autorizada. No hay cambio productivo que revertir hoy.

**Estado: implementado en rama y validado localmente para entrada; compatibilidad integral FAIL; publicación/QA Cloud pendientes. STOP.**
