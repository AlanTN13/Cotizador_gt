# GlobalTrip — reintento acotado del agente PCRAM, preparado localmente

EXECUTION PREFLIGHT / PATCH MODE: Dirección de Ejecución; un agente, S/T1/R1 preparación local. Autorización: instrucción explícita de Alan posterior al cierre de ER #8; autoriza preparar/validar, no publicar. Contrato Execution_Runtime_Contract.md y GlobalTrip_Contexto.md consultados y reconciliados en AlanOS 693e027; ER #8 CLOSED y evidencia 31232cd recuperados. Delta: exclusivamente Agente Despachante.parameters.options.systemMessage. Baseline de trabajo: export publicado guardado fa8ca4c7-a870-40b3-b3db-d79b37906f45, 12 nodos. No relectura Cloud en esta etapa; verificación del baseline vivo obligatoria antes de una publicación separada. Preservar buscador, índice, schema/adaptador/validador, modelo, herramientas, Tax Resolver, tasas, IVA, China/Germán, credenciales/conexiones/settings, web/gateway y demás workflows. Smoke Cloud máximo: cero. Rollback sólo prompt.before.txt con hash candidato vigente; STOP ante divergencia.

## Delta exacto

Se sustituye una única cláusula del prompt, sin agregar reglas de clasificación ni un mecanismo nuevo. candidate.patch.json contiene sólo el campo systemMessage, su hash previo y el valor candidato; prompt.diff es el diff literal. No se genera ni importa un workflow completo.

- Primera consulta NO_MATCH: un único reintento con familia arancelaria sustentada y texto vacío, o, sin esa familia, con el término principal verificable y prefijo vacío.
- Preservar indice/limite. Omitir marca/modelo/términos comerciales de uso que no distinguen aperturas, pero contrastar todos los atributos originales antes de seleccionar un candidato.
- El reintento consume la segunda consulta ya permitida; nunca una tercera. Esta regla no reintenta INVALID_QUERY ni errores. Si la primera devuelve OK, se conserva la posibilidad previa de segunda consulta más acotada.
- Sin candidatos o atributos suficientes: clasificación parcial/null, SIM no acreditado null y estimación explícita. No inventar familia, composición, consultas ni posiciones; no elegir por tasa o apertura residual.

No hay código de fallback nuevo ni cambio del buscador. El límite es una instrucción al agente, no un enforcement técnico adicional.

## Evidencia local

4 PASS / 0 FAIL en tests/pcram-agent-retry-prompt.test.mjs, output validation.tap:
1. Campo único, hashes y rollback limitado al prompt; todos los demás nodos/campos/conexiones/settings/credenciales del candidato en memoria idénticos al export guardado.
2. Revisión estática: sólo cambia la cláusula de estrategia; presupuesto de dos consultas, fuente/atributos, prudencia y formato permanecen.
3. Ejecución literal local de la herramienta publicada, índice/hash intactos: camiseta running → NO_MATCH/0; prefijo6109 → OK/10, devuelve5 partial; camiseta → OK/52, devuelve5 partial. Son las dos alternativas de reintento para probar por separado, no tres llamadas autorizadas al agente por producto.
4. Validador literal vigente con respuestas reales envueltas como Agent V3 y fixtures explícitos: preserva HS6109/SIMnull/estimación pese a candidatos; rechaza identificadores no acreditados sin cambiar DIE. No acredita capacidad semántica del agente.

Las tres respuestas JSON incluyen candidatos, descripciones y versión de fuente. No se eligió SIM para la camiseta ni se calculó una cotización. El prefijo6109 es un caso de prueba sustentado en #34404, no está hardcodeado en el nuevo prompt. No se descarga PCRAM ni se modifica su índice.

## Hashes y recuperación

- Prompt anterior: `00b28a97403b227d9d5ced576d273ae4901f5050dc316bbd829b992b56623f93`.
- Prompt candidato: `0764c384010bb6bd69b56a8b69bb4ce54209a428f532237be3adb56fb3b912b7`.
- Herramienta congelada: `2732532f986dc19258d8602b718c47222edbd2d88a3583240986031f82edd8a5`.
- Índice congelado: `0af99430268dcdeaa1c7db6af7caf33ffba4481bf523a6f386ed96a6aeee903f`.

Rollback disponible: rollback.patch.json / prompt.before.txt; ante autorización futura releer baseline vivo y aplicar sólo systemMessage. Si debe recuperarse, verificar que el prompt vigente sea el candidato y restaurar únicamente ese campo; STOP ante divergencias. Nunca restaurar el workflow completo. Ninguna mutación productiva que revertir en este trabajo.

## Límites y estado

PREPARADO / VALIDACIÓN LOCAL PASS / NO PUBLICADO. El comportamiento real del agente y la reducción de NO_MATCH no se midieron: cero llamadas IA y cero cotizaciones Cloud. El prompt permite la estrategia pero no garantiza que el modelo la siga; no se certifica SIM ni tasa mediante coincidencias. partial=true no prueba exhaustividad. Publicación y QA real requieren autorización separada. No se toca producción, no se agregan nodos ni arquitectura. STOP después del registro.
