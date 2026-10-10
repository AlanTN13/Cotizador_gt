# Publicación 25c9098 — bloqueada antes de preflight vivo

Alan autorizó el 10/10/2026 aplicar/publicar exclusivamente systemMessage de Agente Despachante. PATCH MODE estricto, un ejecutor, S/T2/R2; preservar12nodos y todo el resto. Contrato/contexto vigente reconciliados en AlanOS116ed71: sin diferencias relevantes desde el cierre local c24f827. Candidato/rollback originales y manifest SHA comprobados; no se rehizo código ni se repitieron tests locales.

Bloqueo concreto: no hay N8N_API_KEY en el entorno, la entrada segura temporal anterior ya no existe y el portapapeles no contiene una clave válida. Se comprobó sólo disponibilidad, sin mostrar contenido, crear claves o persistir secretos. Sin credencial no hubo requests API, relectura viva ni publicación. No se acredita coincidencia o divergencia del baseline productivo; no atribuir el bloqueo al workflow.

Esperado para retomar: versiónbaseline fa8ca4c7-a870-40b3-b3db-d79b37906f45, prompt SHA00b28a97403b227d9d5ced576d273ae4901f5050dc316bbd829b992b56623f93. Candidato SHA0764c384010bb6bd69b56a8b69bb4ce54209a428f532237be3adb56fb3b912b7. Conservados candidate.patch.json/rollback.patch.json/prompt.before.txt. Releer baseline vivo antes de modificar; STOP ante diferencias. No importarworkflow completo.

Único desbloqueo pendiente: Alan copia una clave API autorizada al portapapeles y avisa sin pegarla en chat. No requiere crear/rotar una credencial por defecto. Cero modificaciones n8n, requests API, cotizaciones, llamadas IA o pruebas locales repetidas. BLOCKED_API_KEY_UNAVAILABLE / NO_PUBLICADO / STOP.
