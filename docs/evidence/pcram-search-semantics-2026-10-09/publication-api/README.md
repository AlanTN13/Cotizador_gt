# Publicación controlada 3e5cdbb — PASS

Autorización explícita de Alan para aplicar/publicar sólo el buscador PCRAM. Contexto vigente AlanOS `28093758374be8448106a5d1861d152da7ea9b76`; PATCH MODE, un agente, S/T2/R2 por escritura productiva compartida autorizada. Se reutilizaron candidato, patch, rollback y 13 PASS locales previos; no se reconstruyó código ni se repitieron tests.

Preflight GET oficial nuevo: baseline `6028105a-7aba-45ca-88a6-4d60c27a3cf4`, activo, 12 nodos, export y contenido draft/activo exactos al backup esperado. Respaldo API completo privado fuera de Git, SHA `6fc7349f16ecfee85de6b13cb8b703ce3f559d3904aff994a22e8dae85655092`. Clave existente leída del portapapeles sólo en memoria/config stdin; no se mostró ni persistió en argumentos, logs, archivos o Git. No credenciales nuevas/rotadas.

Parche aplicado exclusivamente en `/nodes/11/parameters/jsCode` (`Consulta_nomenclador_PCRAM`), utilizando anchor/hash existente de `patch.json`. Contraste con el candidato 3e5cdbb y recuperación inversa exactos. PUT sobre el recurso existente con `publishIfActive=false`, conservando los datos no afectados del GET fresco; no operación import ni reemplazo por un workflow antiguo. GET de borrador comprobó el único campo, hash, 12 nodos y estado congelado; el baseline anterior permaneció publicado hasta superar ese control. POST activate con la versión verificada. GET final confirmó active=true, versionId=activeVersionId y contenido publicado exacto del candidato.

**Versión publicada y activa: `fa8ca4c7-a870-40b3-b3db-d79b37906f45`**, verificación final `2026-10-09T18:04:54.332620+00:00`.

- Hash tool baseline: `ee5752f5910f77a96df13a927702094d7ad6ad68c873752c4aed635fd722e193`.
- Hash tool publicado: `2732532f986dc19258d8602b718c47222edbd2d88a3583240986031f82edd8a5`.
- Export publicado SHA canónico: `955513c916e4259bcea2685468b63ddb1b6d01da513dc969282df37eb7908539`.
- 12 nodos, identidades/conexiones/settings/credenciales intactas.
- Prompt/agente/modelo/schema/adaptador/validador, índice/decoder PCRAM, Tax Resolver/fuentes/IVA/impuestos/China/Germán/flete/CIF/handling intactos.
- Web/gateway/webhook y otros workflows sin intervención.

`receipt.json` registra requests/status/versiones/hashes y controles. `live.before.api-export.json`, `draft.api-export.json`, `published.api-export.json` son exports verificables sin valores secretos. `published.diff.paths.json` distingue jsCode autorizado de versionId automático; `artifacts.sha256.json` conserva hashes.

Rollback exclusivo `../rollback.patch.json` disponible, no aplicado: antes de recuperar exigir nueva relectura, hash candidato y superficies congeladas sin diferencias ajenas. Restaurar solamente anchor del buscador, nunca workflow completo. Respaldo privado exacto conservado para recuperación.

**0 cotizaciones, 0 llamadas IA, 0 descargas PCRAM, 0 tests repetidos.** QA funcional pendiente exclusivamente Alan: una sola camiseta running equivalente a #34375 desde https://cotizador.globaltriplog.com/cotizador. Luego inspeccionar su traza real; NO_MATCH auténtico no es clasificación exitosa y no autoriza otro desarrollo. PUBLICADO_ACTIVO_VERIFICADO / QA_MANUAL_ALAN_PENDIENTE / STOP.
