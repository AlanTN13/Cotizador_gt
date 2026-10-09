# Diagnóstico PCRAM — ejecución real #34366

**Causa técnica demostrada:** `Consulta_nomenclador_PCRAM` falla al validar su entrada estructurada, antes de buscar en el índice. El esquema de cuatro argumentos tiene `additionalProperties:false`, pero la validación encuentra contexto de n8n (`solicitud`, `siguiente`, `agent_input`, `toolCallId`). No fue una búsqueda sin coincidencias: no se devolvieron candidatos ni `OK`/`NO_MATCH`/`INVALID_QUERY`.

## Identificación y alcance

Ejecución [#34366](https://nexops.app.n8n.cloud/workflow/LO9m0AxSrxRR6JVY/executions/34366), 09/10/2026 10:31:12 Argentina, versión `a4ee337d-4235-4f6b-9d5e-81259c1c2ee8`. FOB USD 1.250, 19 kg, total USD 1.146,92, solicitud `b3212883-8b3f-466f-a7d4-a69080999a8c`. UI: Succeeded, 14,38 s y ~4.924 tokens; el éxito del workflow no implica éxito de la herramienta.

Sólo lectura de ejecución existente en la sesión autenticada. Fuentes canónicas recuperadas contra AlanOS `23a7f32`, contrato y contexto GlobalTrip. Datos de ejecución capturados desde DOM/tablas; resúmenes JSON extraídos y respaldados por esas capturas. No es un export API completo de la ejecución. Del webhook se leyó exclusivamente `body`, sin headers/autenticación. Cero mutaciones/cotizaciones/llamadas nuevas al agente, descargas PCRAM, tests o infraestructura.

## Entrada: sin pérdida comprobada

Los dos enlaces completos, incluyendo querystring, y las descripciones originales `smartwatch` y `Juguete` aparecen íntegros en el body del webhook, en `Preparar agente.agent_input` y en el panel de entrada del agente. [Entrada JSON](agent.input.json), [body sin headers](webhook.body.txt), [preparación](prepare-agent.output.dom.txt), [recepción por el agente](agent.received-input.dom.txt).

Las descripciones son genéricas. La traza inspeccionada no demuestra lectura efectiva de las fichas de Alibaba ni atributos del fabricante; palabras del título de la URL y afirmaciones del agente no prueban acceso al contenido.

## Herramienta: dos intentos fallidos, ambos del smartwatch

`intermediateSteps` contiene dos llamadas, IDs `call_1oSiSjIs7BD5fHZy3dWO5ZcD` y `call_b2c1aaIzxW5YCRKWYYwUxTz1`, ambas con **los mismos argumentos**:

```json
{"indice":1,"prefijo":"","texto":"smartwatch reloj inteligente pulsera actividad bluetooth IP68","limite":5}
```

Ambas observaciones reales son un **string que contiene un array JSON de error**:

```json
[{"error":"Received tool input did not match expected schema\n\n✖ Unrecognized key(s) in object: 'solicitud', 'siguiente', 'agent_input', 'toolCallId'"}]
```

UI de herramienta: Error en 2 ms y 1 ms. **No hay llamada para `indice:2` (juguete)**. No interpretar la segunda llamada como consulta del juguete.

El índice configurado es `pcram-nomenclator-fixed-2134-v1`, importador `pcram-ncm-fixed-2134-v1`, formato empaquetado `pcram-query-prefix-word-deflate-v3`, SHA de ZIP `4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c`, 33.038 SIM. Es metadata del artefacto publicado, **no versión devuelta por una consulta exitosa en este run**. La fuente tributaria es otro snapshot (`fd04e234…`); no hubo consulta en vivo al servicio PCRAM.

[Evidencia original del agente y pasos](agent.output.dom.txt), [extracción estructurada](agent.output.extracted.json), [parámetros exactos](tool-1.query.json), [error 1](tool-1.error.dom.txt), [error 2](tool-2.error.dom.txt), [captura](tool-1.schema-error.png).

El [código oficial de Code Tool](https://raw.githubusercontent.com/n8n-io/n8n/master/packages/@n8n/nodes-langchain/nodes/tools/ToolCode/ToolCode.node.ts) confirma que usa un DynamicStructuredTool y, en execute, invoca el tool con `item.json`. Se consultó master, no se certificó identidad de ese archivo con la versión Cloud instalada: la prueba decisiva sigue siendo el error y los argumentos reales de #34366.

## Agente y validador: no se perdió un SIM válido

| Producto | Clasificación original | SIM original | DIE original | Evidencia | Después del validador |
|---|---|---|---:|---|---|
| Smartwatch | `8517` (HS4 parcial) | null | 16% estimado | [] | Idéntico |
| Juguete | `9503` (HS4 parcial) | null | 20% estimado | [] | Idéntico |

Fundamentos íntegros en [salida extraída](agent.output.extracted.json). El agente alega falta de especificaciones técnicas del smartwatch y de material/edad objetivo del juguete. Son límites declarados por el agente; no se verificaron fichas nuevas ni se asume que todo lo alegado sea jurídicamente necesario.

`returnIntermediateSteps` sí devolvió `action.tool`, objeto `action.toolInput.indice=1` y `observation`. Al hacer `JSON.parse(observation)`, `guardClassification` obtiene un array de error, sin `source.zip_sha256`, `status`, `query.indice` ni `results`. La primera condición que descarta la observación es **`result?.source?.zip_sha256 !== sourceSha`**. El SHA esperado coincide con el del índice configurado; no hay un SHA de fuente devuelto para comparar en el run.

Esto no borró ninguna posición: los HS4 `8517` y `9503` son parciales admitidos por la guardia (`ncm.length <= 6`), y `SIM=null` también es admitido. Los productos/fundamentos están **idénticos antes y después**. [Salida real del validador](validator.output.dom.txt). No hay observación exitosa para certificar todavía cómo n8n envolvería el JSON de resultados correctos; no atribuir un defecto adicional al guard por intuición.

## Tax Resolver: fallback explícito, no tasas específicas PCRAM

| Producto | requestedPosition / ncm / sim | Estado | DIE | TE | IVA | Procedencia |
|---|---|---|---:|---:|---:|---|
| Smartwatch | null / null / null | ESTIMADO | 16% | 3% | 21% | DIE del agente; TE e IVA de reglas generales |
| Juguete | null / null / null | ESTIMADO | 20% | 3% | 21% | DIE del agente; TE e IVA de reglas generales |

Para ambos: `dutyEvidence=null`, `vatEvidence=null`; warnings `POSITION_INCOMPLETE_AGENT_ESTIMATE`, `AGENT_DUTY_ESTIMATE`, `GENERAL_TE_ESTIMATE`, `GENERAL_VAT_ESTIMATE`. `agentEvidence` conserva HS4, SIM null, DIE y fundamento originales. No se intentó lookup específico con NCM8/SIM completo. El 20% del juguete **no salió de PCRAM en esta ejecución**, aunque coincida con una tasa existente. El 16% del smartwatch es estimación de IA, **sin prueba de que haya utilizado AEC**.

La web dice «NCM/SIM no informado» porque no hay posición completa utilizable; el agente sí produjo HS4 parciales. No es pérdida de códigos completos entre nodos. [Auditoría del cálculo](calculator.output.dom.txt), [receipt estructurado](receipt.json).

## Conclusión y única corrección recomendada — NO implementada

- **Smartwatch: situación 2**. Intentó la herramienta dos veces; falló la validación de entrada antes de consultar el índice.
- **Juguete: situación 1**. No hay invocación para el segundo producto; el agente terminó con estimación parcial.
- No ocurrieron situación 5 (descarte de posición completa válida) ni 6 (lookup específico fallido del resolver). Tampoco hay evidencia de una búsqueda que devolviera cero candidatos.

**Corregir exclusivamente la frontera de entrada del Code Tool:** separar el contexto que n8n transporta de los cuatro argumentos de búsqueda, validar éstos y entregar sólo `{indice,prefijo,texto,limite}` a la función existente. Ajustar de forma compatible el schema/adaptador del mismo tool, sin tocar prompt, modelo, índice, impuestos, guardia ni fórmulas. Simplemente permitir propiedades adicionales no basta si se pasan a `queryPackedNomenclator`: esa función también rechaza claves desconocidas.

Este es un defecto técnico demostrado de invocación. Arreglarlo no acredita por sí solo que los atributos permitan un SIM, que el agente consulte el juguete ni que el contrato de observación exitosa pase el guard: esos controles requerirán evidencia posterior autorizada. **Sin implementación ni publicación. STOP.**
