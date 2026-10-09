# PCRAM — cierre mínimo del contrato, PASS integral local

**Resultado: LOCAL_INTEGRAL_PASS_NOT_PUBLISHED.** 15 tests PASS, 0 FAIL. Producción intacta; cero cotizaciones/Cloud/OpenAI/PCRAM downloads.

## EXECUTION PREFLIGHT / PATCH MODE

- Dirección de Ejecución; autorización explícita de Alan para preparar exclusivamente normalización en guardClassification, reutilizando entrada `4d74e4b`.
- Contrato/contexto canónicos AlanOS `03dc887d56b6e47b94b079f7429716f358b2ee3c`; instrucción actual de Alan prevalece sobre el bloqueo previo de esta superficie.
- Baseline: export publicado guardado `a4ee337d-4235-4f6b-9d5e-81259c1c2ee8`, 12 nodos; candidato de entrada `4d74e4b`. No se afirma lectura viva nueva.
- S/T1, R1 local; producción eventual R2 con gate separado. Un único escritor.
- Nuevo delta: sólo normalización acotada del prefijo guardClassification en `/nodes/7/parameters/jsCode`. Se conservan los dos campos de tool ya preparados; no se reimplementan.
- Congelados: parseAgent/contrato de productos, prompt/modelo, índice/decoder/buscador, fuentes tributarias/Tax Resolver/IVA/fórmulas, nodos/conexiones/settings/credenciales, web/gateway y otros workflows.
- Aceptación: entrada → búsqueda literal → respuesta envuelta representativa de Agent V3 → código literal del validador; controles negativos, identidad de congelados y recuperación exacta.
- Smoke máximo: cero Cloud/modelo/cotizaciones. STOP al PASS local; publicación requiere nueva autorización y preflight vivo.

## Único cambio nuevo

`guardClassification` acepta una observación string con un resultado directo o exactamente un item `{response: JSON_string}`. Desenvuelve una sola vez. Rechaza arrays vacíos/múltiples, items con claves extra, errores mezclados, wrappers anidados, valores no string y JSON malformado. Verifica forma de filas antes de buscar pertenencia, evitando aceptar/crashear con filas malformadas.

Los checks actuales siguen activos: nombre de herramienta, status OK/NO_MATCH, fuente y SHA esperados, índice entero del resultado coincidente con el input y el producto, pertenencia exacta NCM/SIM y consistencia de ambos. No cambia DIE orientativo ni inventa/recorta posiciones. Clasificación parcial y estimación se conservan.

[Diff nuevo exacto](guard.diff.exact.txt); [delta de entrada anterior reutilizado](input.diff.exact.txt); [patch combinado](patch.json). [Candidato de revisión](candidate.workflow.json): NO importar/reemplazar workflow completo.

## Pruebas reales locales

Comando: `node --test tests/pcram-tool-input-contract.test.mjs tests/pcram-nomenclator-optimized.test.mjs`.

**15/15 PASS**: 11 controles del contrato y 4 regresiones existentes del índice optimizado. [Log](local-tests.log), [resultados](validation.json).

- Se reproduce el error #34366 en esquema estricto representativo; se corrige con la entrada ya preparada, sin cambios.
- La entrada contextual se valida y filtra; la búsqueda recibe sólo cuatro campos. 16 negativos de parámetros y 6 de formato siguen rechazados.
- Candidatos de controles salen del snapshot real, con código, contexto, fuente/SHA y versión; respuestas idénticas a la búsqueda anterior. No son respuestas de un agente ni clasificaciones comerciales reales.
- El string directo y la envoltura válida pasan; el contrato completo usa jsCode literal de tool y validador con fuentes congeladas. Ejemplo guard conserva SIM `85176272900U` solicitado en fixture de membresía: no acredita clasificar VALDUS.
- 25 observaciones negativas (incluido error real #34366) rechazadas, más herramienta/índice/SHA erróneos. Una consulta de otro producto no acredita el código del primero; códigos inexistentes/contradictorios se rechazan.
- La consulta textual exacta #34366 sigue **NO_MATCH**. No se cambió búsqueda ni prompt para forzar candidatos. Se conserva estimación parcial ante NO_MATCH o ausencia de consulta.
- 12 nodos, mismas conexiones/settings/credenciales/modelo/prompt/tasas/cálculo. Únicamente tres paths combinados autorizados; sólo el guard es nuevo respecto a `4d74e4b`.
- Rollback guard-only recupera el candidato de entrada exacto; rollback combinado recupera exactamente el export publicado guardado.

## Recuperación y hashes

[Rollback exclusivo del nuevo guard](guard.rollback.patch.json) conserva la entrada `4d74e4b`. [Rollback combinado](rollback.patch.json) invierte únicamente los dos campos del tool y el prefijo guard. Ambos requieren hashes/anchors actuales correctos y conservación de campos ajenos; nunca restauración de workflow completo. No hay mutación productiva que revertir hoy.

Hashes baseline/candidato del validador y herramienta en [preparation.json](preparation.json), [receipt](receipt.json) y [manifest](artifacts.sha256.json). Generación: `node scripts/prepare-pcram-observation-contract.mjs` desde artefactos ya preparados.

## Límite de validación

Node/Zod locales representan la conversión del esquema y la envoltura Agent V3 previamente documentada; no se instaló ni ejecutó n8n/LangChain. Se ejecutó el código literal candidato en VM con observaciones locales. **PASS de contrato local, no PASS Cloud/efectividad del agente/lectura Alibaba/clasificación jurídica/tributaria.** No se verificó identidad del código master con la versión Cloud ni baseline vivo fresco. Prueba funcional y publicación pendientes de gate separado.

**Preparado en rama, no aplicado, no publicado. STOP.**
