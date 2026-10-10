# ER #10 — DIE uniforme por familia (local, sin publicación)

**CANDIDATO_LOCAL_PREPARADO — 17 PASS / 0 FAIL — STOP.**

## EXECUTION PREFLIGHT / PATCH MODE

- Dirección de Ejecución; repositorio técnico `Cotizador_gt`, rama `codex/er10-family-die-estimate`. Un agente, un frente.
- Autoridad: ER #10 y decisión AlanOS `6f7e95b`; contrato `Alan/01_Architecture/Execution_Runtime_Contract.md` leído en esa revisión. Contexto focalizado `GlobalTrip_Contexto.md` / `QA_Camiseta_DIE_2026-10-10.md`, ER9 y export publicado guardado.
- S–M / T1 / R2 por decisión tributaria; arquitectura A1, extensión reversible de la decisión DIE. Candidato local, ningún permiso de despliegue. Sandbox efectivo workspace-write / auto_review / red restringida; sin cambios de configuración o privilegios.
- Baseline guardado: `daaff0aa-7fc3-4f01-960a-2a9427531bc1`, 12 nodos; no se releyó Cloud ni se afirma un preflight vivo.
- Única superficie funcional: `Cotizador deterministico.parameters.jsCode`. Agente/prompt/modelo, herramienta, validador, datasets/índice, Tax Resolver específico, TE/IVA, fórmula China/Germán, web/gateway, nodos/conexiones/settings/credenciales congelados.
- Validación: consultas locales literales, cobertura completa y SHA, procedencia honesta, negativos, simulación matemática offline con inputs registrados y rollback exacto. 0 smoke Cloud/IA.
- Recuperación: sólo jsCode y hashes inversos. STOP tras candidato+QA; publicación exige autorización separada y baseline vivo.

## Delta

El adaptador sólo evalúa el nuevo fallback después de descartar posiciones completas: no altera la precedencia específica SIM/NCM. Requiere HS4/HS6 válido, sin SIM, y una observación real válida del subnodo PCRAM para el mismo producto/fuente con un candidato existente compatible con ese prefijo. Lee `intermediateSteps` del agente mediante la referencia de nodo ya existente; no cambia entradas, conexiones o validador. Ausencia/error de la traza conserva la estimación actual.

La preparación deriva del índice congelado comprobantes de **conteo + SHA-256 de todos los SIM + SHA-256 de sus filas tributarias**, por HS4/HS6. No copia códigos, descripciones o tasas ni mantiene otro catálogo. Sólo certifica familias cuyos conjuntos de códigos son idénticos entre fuentes. En runtime utiliza exclusivamente las tasas del snapshot tributario existente; valida fechas/versiones/SHA, conjunto completo, contenido de filas y unanimidad. Ordena una vez los códigos tributarios por ejecución y usa límites binarios de prefijo, sin escanear el catálogo por cada producto. No toma los primeros cuatro candidatos como universo de tasas.

La auditoría usa los campos existentes: `status=ESTIMADO`, `method=FAMILY_SNAPSHOT`, `FAMILY_SNAPSHOT_DUTY_ESTIMATE`, versiones/SHA/cobertura en `source` y `basis`; NCM/SIM y `dutyEvidence` permanecen nulos. La evidencia original DIE16 del agente se conserva. No certifica clasificación ni vigencia legal. El vencimiento de revisión sólo bloquea el nuevo fallback familiar; no altera la retención de tasas específicas del resolver anterior.

## Resultado local

- Caso #34448: mismo input registrado y reproducción local de las dos consultas existentes. Primera NO_MATCH; segunda OK/10, devuelve4 parciales. Comprobación tributaria **10/10**, DIE20 por familia. Total **USD931,88** versus USD906 con estimación16 anterior.
- CIF528,43, flete internacional580, handling90,75, peso29; TE3 e IVA21 sin cambios. El aumento de importes derivados es consecuencia exclusiva de cambiar DIE, no de cambiar fórmulas.
- Smartwatch SIM85176272900U: salida íntegra igual, **DIE0 / TE0 / IVA10,5**. Juguete NCM95030060: salida íntegra igual, **20 / 3**.
- Familia real1001: tasas mixtas0/9/10 → estimación anterior. Familia9503: cobertura incompatible entre snapshots → estimación anterior. Familia1102 uniforme usa su9%, no20% fijo.
- Sin familia/traza sustentable, fuente vieja/incompatible/incompleta, tasa inválida, respuesta errónea/ambigua o producto cruzado → fallback anterior. El contrato comercial/upstream existente acepta los campos de auditoría sin modificación.

**Estos resultados son pruebas offline del código y cálculo; no acreditan comportamiento nuevo del agente ni rendimiento en n8n Cloud.** No se inventó SIM para aprobar un caso.

## Artefactos y reproducción

- `node scripts/prepare-family-die-estimate.mjs docs/evidence/pcram-family-die-prepared-2026-10-10`
- `node --test tests/family-die-estimate.test.mjs`
- `apply.patch.json` y `rollback.patch.json`: un único campo de un único nodo, con guardas SHA y sin importación del workflow completo.
- `calculator.diff`: diff textual exacto (incluye comprobantes derivados); `calculator.before.js` / `calculator.after.js`; `source.diff`: cambio mantenible del adaptador y helper.
- `manifest.json`, `receipt.json`, `tests.tap`, reproducciones/calculadoras `.offline.json` y `artifacts.sha256.json`.

## Recursos y límites de publicación

Código de calculador: 2.467.098 → 3.478.959 bytes, aumento1.011.861 bytes. Comprobantes de integridad:1.004.392 bytes, 6.828 prefijos concordantes;12 prefijos excluidos por cobertura. Sin duplicación de un nomenclador o tasas.

Medición única en procesos Node separados, mismo input: compilación41,39 →48,18ms; evaluación21,76 →42,60ms; heap18,84 →25,38MB. Pico RSS observado95,30 →91,27MiB; **una muestra no demuestra mejora ni seguridad de recursos compartidos**. Datos/harness en `resources.local.json` y `measure.local.mjs`. No se midió n8n Pro; una futura publicación debe considerar el aumento del payload y verificar nuevamente el baseline.

## Recuperación y estado

No se escribió ni publicó n8n. El rollback preparado exige hash candidato y revierte sólo `Cotizador deterministico.parameters.jsCode`, conservando los demás campos del export vigente. El ensayo local reconstruye exactamente los12 nodos y todos los campos del baseline; no restaura una versión antigua completa. Archivos ajenos preexistentes en el repositorio no fueron absorbidos. No merge/deploy/aceptación funcional real acreditados. **STOP.**
