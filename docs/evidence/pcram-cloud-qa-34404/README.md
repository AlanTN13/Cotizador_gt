# QA productiva read-only #34404 — camiseta running

Ejecución real **09/10/2026 15:20:29 Argentina**, 11,599s, versión asociada **fa8ca4c7-a870-40b3-b3db-d79b37906f45**. Producto camiseta de running, FOB500, peso aplicable29, total931,88. Sólo datos guardados en n8n; cero nuevas ejecuciones/cotizaciones/IA/publicaciones/cambios de código o índices. Contexto AlanOS verificado 5863bb8, contrato sin diferencias frente al leído.

## Circuito observado

1. Agente recibe descripción `camiseta de running` y enlace Alibaba original `https://www.alibaba.com/x/B2UFi4?ck=pdp`, FOB500. No consta en estos datos composición textil verificada; no afirmar lectura Alibaba porque haya URL.
2. **Una llamada real** a Consulta_nomenclador_PCRAM: `{indice:1,prefijo:"",texto:"camiseta de running",limite:5}`. Nodo Success in332ms. Resultado **NO_MATCH válido**, no INVALID_QUERY ni error; omisión explícita `de`, términos efectivos `camiseta` y `running`; matched_count=returned_count=0, results=[], partial=false. Fuente índice local ZIP SHA4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c, schema pcram-nomenclator-fixed-2134-v1. No consulta en vivo PCRAM. No segundo intento del agente en esta ejecución.
3. Agente declara cero coincidencias y falta de composición/tecnología para apertura completa; devuelve HS4 `6109`, SIMnull, DIE20 orientativo. **No encontró ni eligió candidato**. Su explicación del NO_MATCH coincide con la respuesta esta vez; no se justifica declarar clasificación exitosa.
4. Validador recibe output e intermediateSteps con action.tool/toolInput/observation string `[{response: JSON_string}]`, incluidos query/índice/fuente/SHA. Conserva exactamente HS6109/SIMnull/DIE20 y siguiente=cotizar. **No eliminó NCM8 o SIM previamente informado**. Sin instrumentación de ramas internas; no se acredita la validación positiva de un SIM candidato inexistente en esta traza.
5. Tax Resolver recibe posición incompleta. requestedPosition/ncm/sim=null; status=ESTIMADO; dutyEvidence/vatEvidence=null. DIE20 método AGENT_ESTIMATE, TE3 e IVA21 método GENERAL_RULE; warnings POSITION_INCOMPLETE_AGENT_ESTIMATE, AGENT_DUTY_ESTIMATE, GENERAL_TE_ESTIMATE, GENERAL_VAT_ESTIMATE. **Las tasas de esta cotización no son un lookup específico al snapshot PCRAM.** CIF528,43, DIE105,69, TE15,85, IVA136,49, total931,88.

## Diagnóstico y límites

**El fallo anterior de contrato INVALID_QUERY ya no ocurre para este input en Cloud.** La consulta procesó texto y devolvió NO_MATCH auténtico. La falta de NCM/SIM completo se origina **en la salida del agente**, después de una búsqueda sin candidatos y de su decisión de conservar HS4 por atributos insuficientes. No hay evidencia de pérdida de posición en el validador ni de una posición específica fallida en Tax Resolver.

Esta traza no prueba que el índice carezca de camisetas, que una palabra individual sea la causante, o que no exista ninguna clasificación posible. Tampoco valida prefijo HS2 (prefijo vacío en este run), devolución OK ni pertenencia de un SIM completo en el guard. No extrapolar consulta NO_MATCH a éxito general de clasificación.

**Recomendación mínima:** conservar estimación explícita para esta entrada; obtener composición/construcción textil verificables antes de exigir NCM8/SIM. La traza no justifica otro parche de integración por sí sola. No implementar ni abrir otra línea de desarrollo.

## Evidencia

identity.json y receipt.json; input/output original del tool y tool-response.json parseado desde celda DOM observada; agent-output.txt; validator-input.txt / validator-output.txt; calculator-output.txt; tool.png; manifest.json con SHA256. Son lecturas de UI de la ejecución, sin headers ni credenciales, no exports de runtime inventados. URL fuente: https://nexops.app.n8n.cloud/workflow/LO9m0AxSrxRR6JVY/executions/34404. STOP.
