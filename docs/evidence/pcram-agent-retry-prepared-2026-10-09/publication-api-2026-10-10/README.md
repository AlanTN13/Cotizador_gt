# Publicación controlada 25c9098 — PASS activo

Alan autorizó el 10/10/2026 publicar exclusivamente systemMessage de Agente Despachante y luego aportó una API key en el portapapeles. PATCH MODE, un ejecutor, S/T2/R2; contexto AlanOS e2e5ef9 contrastado con origin/main sin diferencias relevantes. Candidato/rollback y manifest original íntegros; no se rehizo desarrollo ni se repitieron pruebas locales.

## Preflight y publicación

GET oficial fresco confirmó baseline activo `fa8ca4c7-a870-40b3-b3db-d79b37906f45`, 12 nodos, export exacto al baseline preparado; borrador y contenido publicado coincidentes. Backup completo privado conservado, SHA256 `87fcc5d08798f0e955a3750eaf6012ae58ba8dece4b38a62eb300abb8e0516bf`, archivo protegido fuera de Git. La clave se consumió sólo en memoria/config stdin; no se mostró ni persistió en comandos, archivos o Git.

Segundo GET reconfirmó estado íntegro del backup antes de mutar. Sólo `/nodes/4/parameters/options/systemMessage` fue cambiado usando el candidato original. PUT del recurso existente con publishIfActive=false conserva todos los campos restantes del GET fresco; no operación import ni workflow antiguo completo. Nuevo GET del borrador acreditó único campo/hashes/congelados/12nodos y baseline aún publicado. Sólo después POST activate de esa versión; nuevo GET acredita versión activa y contenido publicado idéntico al candidato.

**Versión publicada y activa: `daaff0aa-7fc3-4f01-960a-2a9427531bc1`**, verificada 10/10/2026 09:57:23 Argentina (12:57:23 UTC).

- Prompt anterior SHA256 `00b28a97403b227d9d5ced576d273ae4901f5050dc316bbd829b992b56623f93`.
- Prompt publicado SHA256 `0764c384010bb6bd69b56a8b69bb4ce54209a428f532237be3adb56fb3b912b7`.
- Export publicado SHA256 canónico `d2f5ee3b3b7e972824970f57210a2de16cc5e82087d8ee2ce32e9d75b96bc678`.

12 nodos/IDs, conexiones/settings/referencias de credenciales, modelo/agente demás campos, herramienta/buscador/índice PCRAM/schema/adaptador/validador, Tax Resolver/tasas/IVA, fórmulas China/Germán intactos. Web/gateway/webhook y otros workflows sin intervención. Diff export distingue único campo funcional de versionId automático. Hashes de congelados antes/candidato/publicado coinciden en receipt.json.

Rollback original exclusivo del prompt disponible `../rollback.patch.json` / `../prompt.before.txt`, no aplicado. Exigir hash candidato y nueva relectura sin cambios ajenos antes de recuperar ese único campo; nunca importar/restaurar workflow completo. Backup privado exacto conservado.

**0 cotizaciones, llamadasIA, tests repetidos o descargas PCRAM.** Seis requests API oficiales (GET preflight más cinco de aplicación/verificación), dos mutaciones autorizadas (guardar borrador y activar). No prueba de efectividad real del agente; pendiente QA de Alan. Clave no persistida por el operativo. El bloqueo de acceso anterior quedó resuelto y esta evidencia reemplaza el estado NO_PUBLICADO de esa tentativa. PASS_PUBLISHED_PROMPT_ONLY / STOP.
