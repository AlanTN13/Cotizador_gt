# Optimización local del candidato PCRAM — Execution Update y Receipt

**LOCAL OPTIMIZATION PASS. No publicado; cero ejecuciones en n8n Cloud y cero llamadas a OpenAI.** La validación real del agente anterior sigue pendiente.

## Preflight y scope lock

Dirección de Ejecución, un agente/escritor. Autorización: optimizar localmente consulta, índices y empaquetado del candidato; medir contra la implementación anterior. Contexto vigente AlanOS `8f323fb`, contrato `Alan/01_Architecture/Execution_Runtime_Contract.md`, ER original y última dirección de Alan. Budget M / T2 / riesgo local R1, R2 si se publicara. Baseline `b5c3e5f`; fuente PCRAM fijada `4cd912aa…8079c`.

Sólo cambia `/nodes/11/parameters/jsCode` del candidato offline. El nodo herramienta es el mismo. Prompt/guardia/modelo/configuración, 12 nodos y conexiones del candidato previo exactamente iguales; los 11 nodos productivos no se leen ni modifican en este trabajo. Impuestos, fuentes, fórmulas, web/gateway/auth fuera de alcance. Recovery: restaurar exclusivamente el cuerpo anterior de esa herramienta desde `b5c3e5f`. STOP tras evidencia y registro; no ampliar arquitectura ni probar en Cloud.

## Implementación y representación

El constructor existente genera una versión derivada `pcram-query-prefix-word-deflate-v3`, con **17.344 rangos de prefijos HS4/HS6/NCM8**, vocabulario de **17.569 palabras**, índice de **4.646 fragmentos de tres caracteres** y postings delta/varint de procedencia NCM/SIM. Todo se calcula una vez durante importación, sin búsqueda semántica ni mantenimiento manual.

Con prefijo se consultan sólo sus NCM/SIM. Sin prefijo, los fragmentos acotan palabras reales y se verifica el substring exacto; sus postings se combinan con mapas de bits para obtener el número total de coincidencias. Sólo se abre texto de los resultados devueltos. No se recorre el catálogo completo de descripciones. Se conservan límites, orden, resultados parciales, fechas, metadata, fuentes y texto literal, incluso descripciones truncadas. **No cambia la semántica de la búsqueda.**

Datos comprimidos DEFLATE en 1.228 bloques HS4. Se abre sólo el catálogo de rangos al inicializar, el índice de términos cuando hace falta y los bloques de texto necesarios. Decoder puro JavaScript [tiny-inflate 1.0.3](https://github.com/foliojs/tiny-inflate), licencia MIT incluida y procedencia/hash en receipt. Código embebido, sin `require`, imports npm, Buffer, TextDecoder, filesystem, red ni instalaciones en n8n. Longitud y Adler-32 verificados antes de parsear cada bloque. No servicios, DB ni herramientas adicionales.

| Tamaño real | Antes | Final |
| --- | ---: | ---: |
| Cuerpo del Code Tool | 13.207.171 bytes | 2.301.909 bytes (**−82,6%**) |
| Índice de datos | 13.204.773 bytes | 2.282.786 bytes |
| Workflow candidato, JSON compacto | 16.268.423 bytes | 5.125.345 bytes |

La fuente y el snapshot tributario mantienen sus versiones previas; ninguna descarga PCRAM nueva. El índice optimizado es inmutable en archivo separado y la reconstrucción es byte-for-byte reproducible. No se sustituyó el índice anterior.

## Mediciones reales

Apple M1, macOS arm64, Node 22.19.0. Ocho consultas idénticas en ambas variantes; tres procesos nuevos por variante/caso (48 procesos locales). Cada proceso mide la primera llamada y 30 llamadas posteriores. Heap de cada hijo limitado a 128 MiB. No llamadas de modelo.

- **Inicialización p50 por caso:** anterior 84,99–91,58 ms; final 44,60–47,91 ms. Incluye compilación del código literal y carga de índices/decoder; excluye lectura del archivo.
- **Pico RSS máximo:** anterior **163,97 MiB**, final **116,39 MiB** (−29,0%). Es el high-water mark del proceso completo Node/V8 durante carga y consultas, no memoria exclusiva del índice ni memoria del workflow n8n.
- “Frío” = inicialización + primera consulta + serialización, incluyendo descompresión diferida. “Caliente” = consulta + serialización en la misma VM ya inicializada, sólo informativa. **No se asume reutilización/caché entre llamadas de n8n.**

| Consulta | Frío antes, p50 ms | Frío final, p50 ms | Caliente antes, p50 ms | Caliente final, p50 ms |
| --- | ---: | ---: | ---: | ---: |
| VALDUS-family | 98.17 | 54.44 | 0.94 | 2.29 |
| Chengji-family | 94.60 | 56.53 | 1.08 | 4.75 |
| shirt-incomplete | 92.04 | 45.68 | 0.78 | 0.25 |
| nonexistent | 92.33 | 47.36 | 0.66 | 0.00 |
| contradictory | 99.23 | 56.57 | 0.81 | 2.31 |
| text-only-shirt | 187.23 | 136.83 | 91.86 | 0.36 |
| exact-SIM | 93.40 | 52.82 | 0.89 | 2.24 |
| broad-text | 176.37 | 146.21 | 83.77 | 1.65 |

Las búsquedas con prefijo VALDUS/juguete/SIM exacto tienen mayor latencia caliente por descomprimir texto (ej.: juguete 1,08→4,75 ms), aunque baja el tiempo total frío y la memoria. No se afirma que cada fase de cada consulta sea más rápida.

Se revisaron registros fuente: VALDUS 2 SIM; juguete 18; camiseta 10; código inexistente 0. Para texto libre `camisetas` y `los` sólo se materializan los seis SIM devueltos; la cantidad total se calcula desde postings, conservando el resultado anterior. Consultas, muestras crudas, p50/p95, RSS y contadores en [benchmark.json](benchmark.json); cifras agregadas en [summary.json](summary.json).

Primera variante intermedia v2: era más pequeña pero “los” frío empeoró 177,53→572,98 ms por abrir demasiados bloques. Se corrigió dentro del alcance con postings por palabra/SIM; la medición intermedia se conserva en [benchmark-intermediate-v2.json](benchmark-intermediate-v2.json), no es el candidato final.

## Controles y Starter

**12 tests PASS:** ocho Python y cuatro Node. Round-trip de todo el nomenclador idéntico; índices/reconstrucción/inmutabilidad; igualdad de respuestas en casos de referencia, texto libre, substring, acentos, búsqueda amplia e inválidos; checksums; ejecución del cuerpo literal del nodo en VM local sin módulos; único delta y recuperación exacta. Los ocho casos medidos conservan SHA-256 idéntico de la respuesta serializada. [Tests](tests-summary.json), [diff del candidato](delta.json), [receipt y hashes](receipt.json).

[Documentación oficial de n8n](https://docs.n8n.io/deploy/use-n8n-cloud/configure-cloud/manage-your-data.md) indica Starter 320 MiB de RAM compartida, CPU 10 millicores burstable, y aproximadamente 180 MiB para n8n solo. [Code node en Cloud](https://docs.n8n.io/build/code-in-n8n/using-the-code-node.md) no admite imports npm externos; este candidato no los requiere.

**No se detectó un bloqueo local que obligue a ampliar arquitectura.** La reducción y las primitivas usadas son compatibles con esas restricciones documentadas. La RAM disponible real, CPU, transporte y sandbox del alojamiento Starter **no están certificados por estas medidas**: el RSS de Node local no equivale al consumo del workflow completo ni de ejecuciones concurrentes, y el M1 no equivale a la CPU de Cloud. No hay prueba/afirmación de PASS Starter ni de mejora funcional del agente. Ambos controles reales permanecen pendientes, deliberadamente sin ejecutar n8n Cloud/OpenAI. No se proponen servicios o infraestructura alternativa.

## Reproducción y recuperación

Desde la raíz de la rama:

```sh
python3 scripts/build-pcram-nomenclator.py --zip data/pcram-nomenclator/source-4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.zip --tax-source-sha256 fd04e2344db684fef46e5fd65d6c8c384fc2ce220054fe063c24f2fd629663eb --optimized
node scripts/prepare-nomenclator-agent.mjs data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json
python3 -m unittest discover -s tests -p test_pcram_nomenclator.py -v
node --test tests/pcram-nomenclator-optimized.test.mjs
node scripts/benchmark-pcram-nomenclator.mjs
```

El candidato está en [candidate.workflow.json](candidate.workflow.json), únicamente para comparación local; no importar/reemplazar el workflow completo. Restituir sólo el `jsCode` de la herramienta anterior restaura exactamente el candidato anterior. No existe cambio productivo que revertir.

**STOP.**
