# Publicación cb77bd5 — PASS activo verificado

Workflow existente `LO9m0AxSrxRR6JVY`. Versión anterior `a4ee337d-4235-4f6b-9d5e-81259c1c2ee8` → nueva activa/publicada **`6028105a-7aba-45ca-88a6-4d60c27a3cf4`**, verificada mediante GET posterior a publicación, 2026-10-09T15:42:04Z. **12 nodos**.

## Preflight y ejecución

Contrato/contexto canónicos AlanOS `163ffc3`; autorización explícita de Alan para publicar cb77bd5 y usar la clave existente recién copiada al portapapeles. PATCH MODE S/T1/R2; riesgo residual compartido Pro ya aceptado. Delta sólo tres campos. Sin cotizaciones ni pruebas IA. Si un control fallaba: STOP y recuperación exclusiva preparada.

GET oficial, backup exacto local privado SHA `cd3ecf683f328879051d36d5d98ca5904d60b3d034be07059ca9b6b984f4499b`. Baseline vivo root y activo coinciden íntegros con respaldo, incluyendo versión activa/anterior, 12 nodos, datos/configuración. Artefactos preparados cb77bd5 verificados por manifest; pruebas 15 PASS/0 FAIL reutilizadas, no rehechas.

Se aplicó `patch.json` sobre datos recién leídos, sólo inputSchema/jsCode del tool y jsCode del validador. Se comprobó igualdad con el candidato preparado y recuperación exacta antes de editar. Actualización de campos por PUT oficial del workflow existente con `publishIfActive=false`; **sin importación de candidato/workflow completo ni cambio de otros campos**. La API transporta nodes/connections/settings del GET sin alteraciones ajenas. GET de borrador verificó exactamente los tres campos/hashes y que la versión previa permanecía publicada. POST `/activate` de esa versión recién verificada; GET final confirmó active=true, versionId=activeVersionId, nodes/connections/nodeGroups del activeVersion idénticos al borrador aprobado.

[Preflight](preflight.verified.json), [borrador](draft.verification.json), [export vivo anterior](live.before.api-export.json), [export publicado](published.api-export.json), [diff paths exacto](published.diff.paths.json), [receipt/hashes/requests](receipt.json). HTTP 200 no se usó como única prueba.

## Integridad y rollback

Únicas diferencias funcionales: `/nodes/11/parameters/inputSchema`, `/nodes/11/parameters/jsCode`, `/nodes/7/parameters/jsCode`; además `/versionId` automático en exports. Índice/decoder/búsqueda conservados en el mismo code prefix; prompt/modelo, Tax Resolver/PCRAM tributario/IVA/fórmulas China/Germán, conexiones/credenciales/settings/webhook intactos. Web/gateway y otros workflows sin intervención. No API de ejecuciones ni requests al cotizador.

Rollback disponible en `../rollback.patch.json`; relectura fresca y hashes candidato antes de restaurar sólo esos tres campos/prefijos. Recuperación comprobada en preparación/preflight, **no aplicada** porque publicación PASS. Nunca restaurar workflow antiguo completo. Backup API completo exacto conservado privado fuera de Git; exports en evidencia contienen sólo referencias de credenciales, no valores. Clave API usada sólo en memoria y stdin de curl; nunca argumentos/logs/archivos/Git, ninguna credencial creada/rotada/modificada.

## Estado real y QA

**PUBLICADO_ACTIVO_VERIFICADO / QA_ALAN_VALDUS_PENDIENTE / STOP.** Alan hará una sola cotización VALDUS desde `https://cotizador.globaltriplog.com/cotizador`; operativo 0 cotizaciones/llamadas IA/descargas PCRAM. No iniciar automáticamente otros productos ni inspecciones de ejecución todavía. La consulta textual anterior da NO_MATCH; no forzar SIM ni atribuir tasas estimadas a PCRAM. Publicación no acredita mejora semántica, lectura Alibaba, respuesta exitosa real ni RAM Cloud; revisión de esa única ejecución pendiente después de prueba manual.
