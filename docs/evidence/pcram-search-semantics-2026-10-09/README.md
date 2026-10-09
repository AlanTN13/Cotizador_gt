# PCRAM — corrección local de semántica de búsqueda

EXECUTION PREFLIGHT / PATCH MODE
- Rol: Dirección de Ejecución, un agente, buscador local existente.
- Autorización: implementación y pruebas locales de HS2 + stopwords breves; no publicar.
- Contexto: contrato y GlobalTrip_Contexto en AlanOS origin/main ebe7a81; decisión aprobada 2026-10-09. S / T1 / R1 local; publicación futura conserva gate propio.
- Baseline: rama codex/pcram-nomenclator-readonly, publicación respaldada 6028105a-7aba-45ca-88a6-4d60c27a3cf4; tool SHA ee5752f5910f77a96df13a927702094d7ad6ad68c873752c4aed635fd722e193.
- Delta: admitir capítulo HS2 mediante rangos HS4 existentes; omitir sólo stopwords breves explícitas y registrar omisiones. Sin otro índice ni catálogo.
- Congelado: prompt/modelo/validador, adaptador y schema, índice/decoder, Tax Resolver/fuentes/impuestos/fórmulas, web/gateway/credenciales, conexiones/settings y 12 nodos.
- Validación: reproducción exacta #34375 antes/después; consultas previas, negativos, límites/procedencia; literal tool + guard existente sólo offline; integridad y rollback exacto.
- Smoke Cloud máximo: cero. Sin nuevas cotizaciones, llamadas IA ni descargas PCRAM.
- Rollback: exclusivamente jsCode de Consulta_nomenclador_PCRAM, con hash/anchor; no restaurar workflow completo.
- STOP tras validación local y registro; cualquier publicación requiere autorización y baseline vivo fresco.

## Resultado: PASS local / preparado / no publicado

Reproducción exacta de los dos argumentos de #34375 con baseline publicado: ambos INVALID_QUERY. Candidato: ambos **NO_MATCH auténtico**, cero candidatos, igualdad con búsqueda de referencia sobre la misma fuente. No se cambió AND léxico, no se inventó composición/código ni se forzó clasificación.

El capítulo HS2 reutiliza como máximo 100 rangos HS4 existentes; para 61 visita **132 NCM / 715 SIM / 17 shards**, sin barrer las 33.038 posiciones. La segunda consulta usa postings de términos existentes, **0 SIM / 0 NCM / 0 shards** visitados (índice de términos descomprimido). No se regeneró ni modificó el índice.

Whitelist cerrada de stopwords breves: `de, el, la, en, un, y, o`. Sólo se omiten esos tokens. `aa`, `ab`, `x`, formatos/códigos incompletos, tipos/límites inválidos y consultas sin prefijo ni términos significativos siguen rechazados. Hasta ocho términos significativos y 160 caracteres totales; límite de 1 a 8 resultados sin cambios. Las omisiones quedan explícitas en `normalization.ignored_terms`, junto a términos efectivos; `query` conserva el texto original. Sin omisiones, la respuesta de consultas ya admitidas permanece idéntica. Términos de tres caracteres como `los` permanecen intactos.

**13 PASS / 0 FAIL:** 9 controles focalizados nuevos y 4 existentes de optimización. Se comprobó el tool literal aislado (incluye contexto n8n) → respuesta envuelta → código actual del validador, sin cambiarlo. Control exitoso usa filas reales del capítulo, exclusivamente como fixture de pertenencia; no acredita clasificación del agente. Controles negativos mantienen SHA/fuente/índice del producto/pertenencia y errores malformados. Las posiciones/fechas/contexto devueltos coinciden con el snapshot; no se devuelven tasas desde esta herramienta.

Único campo diferente del candidato: `/nodes/11/parameters/jsCode`. Mismos 12 nodos, conexiones/settings/credenciales/inputSchema y todo lo demás, incluidos prompt/modelo, validador, Tax Resolver/PCRAM tributario/IVA/fórmulas China y Germán. Índice comprimido, decoder y proyección de entrada idénticos. El módulo lineal de referencia incorpora la misma semántica sólo para servir de oracle local; no se inserta en n8n ni reemplaza el buscador optimizado.

Hash tool baseline: `ee5752f5910f77a96df13a927702094d7ad6ad68c873752c4aed635fd722e193`. Candidato: `2732532f986dc19258d8602b718c47222edbd2d88a3583240986031f82edd8a5`. Tamaño tool: 2,302,611 → 2,303,365 bytes (delta +754).

## Artefactos y recuperación

- `candidate.workflow.json`: candidato offline para contraste, **no importar** ni activar. Su versionId es la del backup, no una versión nueva publicada.
- `tool.diff.exact.txt` / `source.diff.exact.txt`: diff completo del buscador y sus fuentes.
- `patch.json` / `rollback.patch.json`: sustitución de un anchor exacto del buscador, con hashes antes/después. Rollback probado recupera exactamente el backup, exclusivamente jsCode de la herramienta.
- `reproduction.before.json` / `reproduction.after.json`, `local-tests.log`, `receipt.json`, `manifest.json`: evidencia reproducible.
- `node scripts/prepare-pcram-search-semantics.mjs`; `node --test tests/pcram-search-semantics.test.mjs tests/pcram-nomenclator-optimized.test.mjs`.

Antes de una futura publicación: nueva autorización, exportación viva y comparación con este baseline guardado; STOP ante diferencias materiales. Este trabajo no relee ni modifica Cloud. **0 cotizaciones, 0 llamadas OpenAI, 0 publicaciones, 0 descargas PCRAM.** La falta de coincidencias no prueba clasificación correcta ni resuelve falta de atributos. STOP.
