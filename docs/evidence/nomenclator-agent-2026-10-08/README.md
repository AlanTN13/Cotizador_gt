# Consulta acotada PCRAM — implementación fuera de producción

**Execution Update: PREPARADO + PASS local; validación funcional del agente pendiente. No publicado.**

Encargo canónico: `Alan/04_Clientes NexOps/Global_Trip/ER_Consulta_Nomenclador_Agente_2026-10-08.md`, AlanOS revisión `46357f2`. Rama: `codex/pcram-nomenclator-readonly`.

## Delta implementado

1. `scripts/build-pcram-nomenclator.py` reutiliza sin modificar el importador existente `scripts/import-pcram-die-te.py`. Genera un índice inmutable por SHA-256 de la transferencia, sin tasas. Conserva descripción SIM, contexto NCM literal, fecha y señales de posible truncamiento. Se incluye el importador anterior como dependencia reproducible, sin cambiar su lógica.
2. `workflow/pcram-nomenclator-query.mjs` busca por prefijo válido y términos literales. Máximo ocho resultados, ocho términos y 160 caracteres; devuelve versión, contexto, cantidad de coincidencias y `partial`. No red, descarga por cotización, escritura, modelo ni selección por tasa. El catálogo queda dentro del código de la herramienta; sólo los resultados acotados llegan al modelo.
3. Candidato n8n local con **un solo Code Tool adicional** (`Consulta_nomenclador_PCRAM`) conectado por `ai_tool` al agente. Los 11 nodos originales se conservan. Ajuste mínimo de instrucciones y `returnIntermediateSteps=true` para disponer de consultas reales; guardia de salida dentro del validador existente. El modelo y su configuración permanecen idénticos.
4. La guardia comprueba NCM8/SIM contra candidatos efectivamente devueltos para el índice del producto. No modifica DIE, no fabrica un código más corto ni elige un reemplazo. Ante un identificador completo no acreditado, lo elimina y etiqueta la estimación en `fundamento`; conserva HS4/6 y fallback existentes. **Es una comprobación de procedencia, no de compatibilidad semántica ni un segundo clasificador.** Esa compatibilidad sigue requiriendo atributos y evidencia del agente.

Cambios JSON exactos en [delta.json](delta.json); textos completos en [prompt.diff](prompt.diff) y [validator.diff](validator.diff). El nodo completo está en [candidate.workflow.json](candidate.workflow.json), **artefacto offline de contraste, no archivo para importar a producción**.

## Fuente y estructura verificadas

Fuente pública: [transferencia PCRAM](https://web.pcram.net/downloads/transf.zip). Estructura: [documentación oficial](https://www.pcram.net/downloads/estructura.html). El formato de la herramienta corresponde al [Code Tool oficial de n8n](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolcode/).

En `ncm.txt`: NCM 1–10; SIM 11–14; contexto NCM 15–1538; descripción SIM 1539–1792; fecha 2089–2094. Los seis segmentos de 254 bytes del contexto continúan palabras: se unen literalmente antes de normalizar espacios. No se les asignan títulos jerárquicos o notas legales inventadas. El contexto contiene descripción y ascendentes concatenados, sin códigos separados para cada nivel. Descripciones potencialmente truncadas se entregan como están.

Índice: **33.038 SIM y 10.504 NCM**, fuente ZIP `4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c`; índice SHA-256 `2aa798cb2752df590e0216b1ca3a4bedf4ccbe762f88bc773c622adf7b96c9e1`.

La transferencia anterior del dataset tributario no estaba retenida. Se descargó una vez la transferencia pública durante preparación y se conserva para reconstrucción. **El nomenclador usa una versión distinta del snapshot tributario congelado** (`fd04e2344db684fef46e5fd65d6c8c384fc2ce220054fe063c24f2fd629663eb`): nueve SIM agregados y uno eliminado. Ambas versiones están declaradas en metadata; no se actualizó ninguna tasa ni fuente del Tax Resolver. Si éste no reconoce una posición de la versión nueva, conserva su resolución/fallback vigente. Diferencias completas y timestamp en [source-verification.json](source-verification.json).

## Validación separada

**Índice/búsqueda: PASS.** Cinco tests Python: formato, contexto continuo, integridad ZIP, duplicados/conflictos, reconstrucción determinista y preservación del índice válido. Reconstrucción desde el ZIP real byte-for-byte idéntica.

**Integración local: PASS.** Ocho tests Node: búsqueda acotada, formatos sin reparación, inmutabilidad, observaciones por producto, guardia, 12 nodos/alcance/rollback, ejecución del código literal de la herramienta y validador en VM local, controles sobre el calculador congelado. [Tests y comandos](tests-summary.json). Estos controles no ejecutaron n8n ni el modelo.

Consultas ejecutadas directamente sobre la herramienta candidata, **no llamadas del agente**:

| Caso | Consulta local | Resultado |
| --- | --- | --- |
| VALDUS, familia candidata | `85176272` + `frecuencia` | `85176272100A`, `85176272900U`; dos candidatos reales, sin clasificación final acreditada |
| Chengji, familia candidata | `95030060` + `plastico` | Cuatro SIM, incluidos `95030060912G` y `95030060992H`; no equivalen a todos los SIM de ese NCM |
| Camiseta incompleta | `6109` + `camisetas` | Diez coincidencias, seis devueltas, `partial=true`; no se elige composición ni SIM |
| Código inexistente | `99999999999Z` | `NO_MATCH` |
| Atributo incompatible con texto | `85176272900U` + `algodon` | `NO_MATCH`; no acredita una evaluación semántica del modelo |

Requests/responses completos en [tool-queries.local.json](tool-queries.local.json). Son controles de recuperación léxica; no prueban que los candidatos correspondan al producto.

**Resolver congelado: PASS con contratos sintéticos de control.** El SIM existente devuelto por la herramienta `85176272900U` resuelve DIE/TE/IVA `0/0/10,5`, con DIE/TE PCRAM y la regla IVA específica anterior. NCM `95030060` resuelve `20/3/21`, con DIE/TE PCRAM. HS `6109` conserva estimación, DIE suministrado sin cambio, total `931,88`, flete internacional `580` y handling con IVA `90,75`. Ningún código esperado se incorporó al prompt y no se acredita clasificación real de VALDUS mediante estos fixtures.

**Comportamiento real: PENDIENTE.** No existe un ejecutor autorizado fuera de producción con la credencial OpenAI ya configurada en n8n; tampoco hay una clave OpenAI disponible para ejecución local. No se extrajo la credencial cifrada, no se crearon credenciales ni un workflow desplegado de pruebas y no se modificó el flujo vivo. Comparación planificada: cuatro casos × dos repeticiones × baseline/candidato = 16 llamadas, mismo `gpt-5-mini`, razonamiento `low`, configuración y Web Search. Cero llamadas realizadas. [Entradas documentadas](agent-evaluation-cases.json) y [comparación explícitamente NOT_RUN](agent-comparison.json). Las salidas históricas allí registradas sólo dan contexto; no son un A/B controlado ni prueba de mejora.

También queda pendiente ejercitar límites del Code Tool/task runner/transporte de n8n fuera de producción: herramienta embebida 13,2 MB, candidato compacto 16,3 MB. La documentación de Code Tool confirma interfaz, no la capacidad efectiva del alojamiento para este payload. No se declara el candidato apto para publicar antes de verificar ambos pendientes.

## Integridad, Receipt y recuperación

Exportación fresca de producción idéntica al baseline: workflow `LO9m0AxSrxRR6JVY`, activo, versión `f2ea74d7-7b65-472b-9d5f-441595fc6e90`, **11 nodos**, cero mutaciones y cero ejecuciones. [Evidencia](production-integrity.json).

En el candidato sólo difieren cinco rutas autorizadas: instrucciones del agente, retorno de pasos, código del validador, nodo herramienta adicional y su conexión `ai_tool`. Conexiones principales/settings/credenciales/modelo/schema/Web Search y demás nodos idénticos. Calculador/PCRAM/IVA/China/ajustes Germán congelados: SHA-256 `dd9319fd8ca58633fba944cc31c9d67a1b41a0114453bc68a4c37ea1e91ce7de`. Gateway/web no intervenidos.

[Execution Receipt](receipt.json) contiene hashes de prompt, validador, herramienta, fuente y candidato. Recuperación exclusiva del delta: eliminar nodo `0944bbbe-5bc2-4e8c-a8f5-67aeed667023` y conexión `Consulta_nomenclador_PCRAM`; restaurar `prompt.before.txt`, `returnIntermediateSteps=false` y `validator.before.js`. El contraste en memoria restaura exactamente el baseline. **No importar ni restaurar el workflow completo.** No hubo cambio productivo que revertir.

## Reproducción local

Desde la raíz de la rama, sin claves ni acceso a n8n:

```sh
python3 scripts/build-pcram-nomenclator.py --zip data/pcram-nomenclator/source-4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.zip --tax-source-sha256 fd04e2344db684fef46e5fd65d6c8c384fc2ce220054fe063c24f2fd629663eb
node scripts/prepare-nomenclator-agent.mjs data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.json
python3 -m unittest discover -s tests -p test_pcram_nomenclator.py -v
node --test tests/pcram-nomenclator.test.mjs
```

Estos comandos reconstruyen artefactos locales; ninguno publica o consulta producción. La comparación real queda pendiente del ejecutor aislado autorizado, sin ampliar este alcance.

**STOP.**
