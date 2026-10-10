# ER #11 — publicación bloqueada por acceso API

**BLOCKED_EXTERNAL / NO PUBLICADO / STOP.** Autorización recuperada desde ER11 y AlanOS `c3e5355`. No se reconstruyó candidato ni repitieron pruebas.

El entorno de comandos no tiene `N8N_API_KEY`. El mecanismo de portapapeles ya autorizado y utilizado en la publicación anterior no proporciona una clave textual: devuelve contenido no decodificable como UTF-8. No se muestran/copían/persisten contenidos de portapapeles. La clave anterior fue consumida sólo en memoria; no se encontró una entrada de clave disponible en su directorio de ingreso conocido. No se buscan credenciales por otros canales ni se crean nuevas.

ER11 exige: «Si no hay acceso API válido, no inventar canales ni nuevas claves; STOP con bloqueo documentado». Por eso **0 requests n8n / 0 mutaciones / 0 cotizaciones / 0 llamadasIA**. No hay export fresco, preflight vivo, versión nueva ni activación comprobada; no confundir el baseline guardado con una relectura productiva.

Candidato y rollback de `0d27665` conservados sin alteraciones. Hash esperado previo `dd9319fd8ca58633fba944cc31c9d67a1b41a0114453bc68a4c37ea1e91ce7de`; candidato `2530f19f9fe18b928cbeb0cf4d2cbadc8c005e0a139f29d19c5fbf72bdc5be99`. Última versión previamente acreditada `daaff0aa-7fc3-4f01-960a-2a9427531bc1` (no verificada nuevamente aquí).

**Único requisito pendiente:** API key válida disponible en el canal autorizado para poder iniciar GET/export/preflight. No se afirma falta de permisos n8n: no se llegó a autenticar. No se autoriza una nueva clave por este receipt. STOP.
