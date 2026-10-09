# Executive Request #8 — contraste local PCRAM

EXECUTION PREFLIGHT / PATCH MODE: Dirección de Ejecución, un agente, S/T0/R0 read-only local. Autorización: https://github.com/AlanTN13/Cotizador_gt/issues/8 y encargo explícito de Alan. Contrato/GlobalTrip_Contexto sin deltas frente al leído, contexto canónico e5887d9 y ER_Contraste_Local_PCRAM_2026-10-09.md consultados. Baseline: código 3e5cdbb, versión publicada respaldada fa8ca4c7-a870-40b3-b3db-d79b37906f45. Superficies congeladas: todo el código/datos/workflow/producto. Sólo tres llamadas locales al buscador existente, indice1/limite5. Sin desarrollo, tests amplios, Cloud, IA, descargas ni publicación. Rollback funcional no corresponde: cero mutaciones. STOP tras comparación y registro.

## Respuestas reales

| Consulta | Estado | Coincidencias totales | Devueltas | partial |
|---|---|---:|---:|---|
| prefijo6109 / texto vacío | OK | 10 | 5 | true |
| prefijo vacío / texto camiseta | OK | 52 | 5 | true |
| prefijo vacío / texto camiseta running | NO_MATCH | 0 | 0 | false |

Los primeros cinco códigos coinciden entre ambas consultas amplias:

- 61091000110Y, NCM61091000: `De talle superior al 16 o sus equivalentes. «T-shirts». - De algodón. «T-shirts» y camisetas, de punto. Prendas y complementos (accesorios), de vestir, de punto.`
- 61091000190Z, NCM61091000: `Las demás. «T-shirts». - De algodón. «T-shirts» y camisetas, de punto. Prendas y complementos (accesorios), de vestir, de punto.`
- 61091000210D, NCM61091000: `De talle superior al 16 o sus equivalentes. Camisetas interiores. - De algodón. «T-shirts» y camisetas, de punto. Prendas y complementos (accesorios), de vestir, de punto.`
- 61091000290E, NCM61091000: `Las demás. Camisetas interiores. - De algodón. «T-shirts» y camisetas, de punto. Prendas y complementos (accesorios), de vestir, de punto.`
- 61099000111N, NCM61099000: `De talle superior al 16 o sus equivalentes. De fibras sinteticas o artificiales. «T-shirts». - De las demás materias textiles. «T-shirts» y camisetas, de punto. Prendas y complementos (accesorios), de vestir, de punto.`

Descripciones literales del índice, sin completar textos ni elegir una apertura. Las cinco muestran updated_at2026-10-01. query-1.response.json y query-2.response.json incluyen contexto NCM literal, source_uri, flags de completitud y metadata. partial=true significa que se muestran sólo cinco filas; no deducir que la familia contiene únicamente algodón o fibras sintéticas ni homogeneidad tributaria.

## Conclusión

**CANDIDATOS_RECUPERABLES_CON_BUSQUEDA_AMPLIA.** El buscador actual sí recupera posiciones reales de la familia por prefijo6109 y por camiseta. Al mantener el mismo índice, producto y límite y añadir running a camiseta, la consulta AND devuelve cero. Por tanto una descripción comercial con ese término impide recuperar candidatos que ya están disponibles; NO_MATCH no significa ausencia de camisetas en el catálogo. Se trata de selectividad lexical, no pérdida del dataset ni INVALID_QUERY.

La comparación no certifica SIM aplicable a la camiseta real, lectura Alibaba, composición, construcción o tributos. No se eligió SIM ganador ni se consultó Tax Resolver. No se hizo una cuarta consulta para running aislado ni pruebas globales. Cualquier modificación/fallback/prompt o QA Cloud necesita un gate separado. No se propone ni implementa cambio aquí.

## Fuente y reproducibilidad

Se invocaron exclusivamente loadPackedNomenclator y queryPackedNomenclator de workflow/pcram-nomenclator-packed.mjs, una vez por cada query exacto del ER, con runtime local por consulta. El módulo está incluido literalmente en el tool publicado respaldado, cuyo hash se cotejó antes de consultar. Se verificó el hash del índice antes/después; no se descargó ni modificó la transferencia. No se generó un script, catálogo ni índice nuevo.

Schema pcram-nomenclator-fixed-2134-v1; importer pcram-ncm-fixed-2134-v1; packed format pcram-query-prefix-word-deflate-v3. ZIP SHA256 `4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c`; archivo índice SHA256 `0af99430268dcdeaa1c7db6af7caf33ffba4481bf523a6f386ed96a6aeee903f`. Tool SHA256 `2732532f986dc19258d8602b718c47222edbd2d88a3583240986031f82edd8a5`. 33.038 SIM /10.504 NCM. Índice para clasificación, sin tasas ni notas legales estructuradas; snapshot tributario separado. No consulta PCRAM en vivo.

Artefactos: tres responses completas, receipt.json y manifest.json SHA256. Estado: LOCAL_READONLY_COMPARISON_COMPLETE / CANDIDATOS_RECUPERABLES_CON_BUSQUEDA_AMPLIA / STOP.
