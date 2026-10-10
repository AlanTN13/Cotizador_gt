# ER #11 — publicación controlada del calculador — PASS activo

**PASS_PUBLISHED_CALCULATOR_ONLY / STOP.** Candidato original `0d2766541135b58a81f3cacba211bf9881acd7cb`, sin reconstrucción ni tests repetidos. Autorización ER11/AlanOS `c3e5355`, recuperación del acceso explícitamente aportada por Alan mediante portapapeles; contexto vigente `faf2de9` sin nuevos deltas al publicar.

## Preflight vivo

GET oficial n8n confirmó workflow `LO9m0AxSrxRR6JVY` activo, baseline exacto `daaff0aa-7fc3-4f01-960a-2a9427531bc1`,12 nodos, borrador y contenido activo idénticos. Hash previo `dd9319fd8ca58633fba944cc31c9d67a1b41a0114453bc68a4c37ea1e91ce7de`. Respaldo fresco privado600 fuera de Git; SHA canónico `4d5984c5ffd2732d5764038f80cda17199ec65e1925c810baaf331de2bac980b`. Una nueva lectura reconfirmó identidad íntegra del backup antes de mutar.

## Aplicación y activación

Único cambio funcional `/nodes/9/parameters/jsCode` (`Cotizador deterministico`), valor exacto de `../apply.patch.json`. PUT del workflow existente con `publishIfActive=false`, usando todos los campos vigentes restantes del GET; no importación de workflow ni sustitución por export antiguo. GET del borrador acreditó hash exacto candidato,12nodos y todas las superficies congeladas; la versión anterior permanecía publicada. Sólo después se activó el ID de ese borrador verificado. GET final confirma `active=true`, `versionId=activeVersionId` y contenido publicado idéntico al candidato verificado.

**Versión publicada y activa: `7739824e-8248-4e7e-8534-72a96d7004d0`**, lectura final `2026-10-10T14:37:27.828247+00:00` (10/10/2026 11:37:27 Argentina).

- Calculador anterior SHA256: `dd9319fd8ca58633fba944cc31c9d67a1b41a0114453bc68a4c37ea1e91ce7de`.
- Calculador activo SHA256: `2530f19f9fe18b928cbeb0cf4d2cbadc8c005e0a139f29d19c5fbf72bdc5be99`.
- Export activo SHA256 canónico: `c80aee04173ca35d595152373b2e1c72203f9620cb0c3beb036a47b8a7676a78`.

Diff export contiene únicamente el campo de código autorizado y `versionId` automático. Hashes de nodos excepto calculador, conexiones, settings y referencias de credenciales coinciden antes/candidato/activo. Agente/prompt/modelo, herramienta/buscador/índice PCRAM, validador, fuentes DIE/TE/IVA, precedencia específica, fórmulas China/Germán, webhook, web/gateway y otros workflows sin intervención. Los12nodos y sus IDs conservados.

## Recuperación / límites

Rollback exclusivo del calculador `../rollback.patch.json`, backup fresco privado disponible. Exigir nueva lectura, identidad, hash candidato y congelados antes de restaurar sólo jsCode. No aplicado: controles de borrador y publicación PASS. No restaurar workflow completo ni perder ajustes posteriores.

Clave sólo en memoria/configstdin del transporte existente, no logs/archivos/Git; proceso terminado. No credenciales creadas o modificadas. Seis requests oficiales totales incluyendo preflight; dos mutaciones autorizadas (borrador/activación). **0 cotizaciones,0 llamadasIA,0 tests repetidos,0 descargasPCRAM.** No valida producto ni recursos compartidos bajo carga. Riesgo residual Pro aceptado en ER11; no modificación de plan/otrosclientes/settings.

Bloqueo de acceso anterior resuelto: este receipt reemplaza su estado NO_PUBLICADO. Publicación técnica PASS; QA funcional queda separada, Alan hará como máximo una camiseta equivalente a #34448 desde [cotizador habitual](https://cotizador.globaltriplog.com/cotizador). **STOP.**
