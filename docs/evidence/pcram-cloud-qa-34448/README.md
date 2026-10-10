# GlobalTrip — QA real camiseta #34448, diagnóstico read-only

EXECUTION PREFLIGHT / PATCH MODE: Dirección de Ejecución; un agente, S/T0/R1 lectura de ejecución guardada. Pedido de Alan: explicar total906 vs931,88 tras daaff0aa. Contrato/contexto canónicos recuperados y reconciliados a042d41, incluido QA_Camiseta_DIE_2026-10-10.md. Baseline de comparación: receipt/trazas #34404 (671f885) y publicación prompt f2b0b7a. Congelado todo código/prompt/modelo/buscador/índice/impuestos/fórmulas/producción/web/gateway. Cero cotizaciones nuevas/IA/tests/downloads/mutaciones. No rollback: no cambios. STOP tras causa y registro.

## Ejecución y recorrido demostrado

[#34448](https://nexops.app.n8n.cloud/workflow/LO9m0AxSrxRR6JVY/executions/34448), 10/10/2026 10:02:16 Argentina, Success14,26s, link Autosave versión **daaff0aa-7fc3-4f01-960a-2a9427531bc1**. Camiseta de running, enlace Alibaba original, FOB500; bultos idénticos al caso previo: peso real20, volumétrico28,8, aplicado29. ~7037tokens mostrados por n8n, no factura de consumo. Lectura UI autenticada; archivos son campos transcritos/decodificados de DOM visible, no export API crudo ni una simulación.

1. Consulta real `{indice:1,prefijo:"6109",texto:"camiseta de running",limite:4}` → **NO_MATCH**,0candidatos; omite de, AND camiseta/running. Envoltura AgentV3 válida en intermediateSteps.
2. Reintento real `{indice:1,prefijo:"6109",texto:"",limite:4}` → **OK**,10coincidencias,4devueltas,partial=true. FuenteZIP4cd912aa…079c; mismo índice local, no PCRAM en vivo. SIMdevueltos **61091000110Y / 61091000190Z / 61091000210D / 61091000290E**, todos NCM61091000, contexto algodón y fecha2026-10-01. Dos consultas totales, mismo indice/limite: estrategia autorizada demostrada para este run.
3. Agente devuelve **HS6109 / SIMnull / DIE16**. Fundamento literal en agent-output.transcribed.json: falta composición, no asigna SIM; describe DIE16 como alícuota orientativa estimada para prendas. Cita URI de candidato como evidencia del nomenclador; esa consulta no devuelve tasas. No hay fuente tributaria específica justificando16 en la salida observada.
4. Validador recibe esa salida y conserva HS6109/SIMnull/DIE16, siguiente=cotizar. **No descartó una posición completa** ni fabricó otra.
5. TaxResolver: **ESTIMADO / requestedPosition,ncm,sim=null / dutyEvidence,vatEvidence=null / duty16% mediante AGENT_ESTIMATE**, fuente n8n-agent-contract…product-1; base explícita sin posición completa ni consulta específica al snapshot. TE3% e IVA21% GENERAL_RULE. Warnings POSITION_INCOMPLETE_AGENT_ESTIMATE, AGENT_DUTY_ESTIMATE, GENERAL_TE_ESTIMATE, GENERAL_VAT_ESTIMATE. PCRAM tributario no aportó una tasa específica a esta camiseta.

## Comparación con #34404 y causa del monto

| Campo | #34404 fa8ca4c7 | #34448 daaff0aa |
|---|---:|---:|
| Consultas nomenclador |1 NO_MATCH/0|2 NO_MATCH→OK/4de10|
| Clasificación / SIM |6109 / null|6109 / null|
| DIE / procedencia |20% estimación agente|16% estimación agente|
| Flete internacional |580,00|580,00|
| Handling con IVA |90,75|90,75|
| CIF |528,43|528,43|
| DIE importe |105,69|84,55|
| TE importe |15,85|15,85|
| IVA importe |136,49|132,06|
| Débitos/créditos |3,10|2,79|
| Total |931,88|906,00|

**Causa demostrada del -25,88:** DIE estimado cambiado por el agente de20 a16 → derechos21,14menos; IVA4,43menos por su base menor; débitos/créditos0,31menos. Logística/pesos/CIF/handling iguales. No es una tasa16 verificada en PCRAM ni un lookup específico fallido. El porqué tributario exacto de16 frente a20 no se puede certificar: el fundamento sólo declara estimación genérica; no observar razonamiento interno ni atribuir causalidad exclusiva al prompt por dos runs.

**Resultado del reintento:** funciona en Cloud para este caso y recupera candidatos, pero no logró clasificación completa. Falta de composición sigue impidiendo elegir apertura; cuatro resultados parciales no representan toda la familia6109. No confundir URI de clasificación con evidencia de una alícuota. No se demuestra defecto del buscador/validador/TaxResolver en este run.

**Única recomendación:** obtener composición textil verificable antes de exigir apertura NCM/SIM y tasa específica; conservar estimación explícita, sin fijar20% para reproducir Excel. No propuesta de parche ni publicación autorizada por este diagnóstico.

Evidencia: tool-observations.selected-fields.json (observaciones reales decodificadas), agent-output.transcribed.json, validator-output.transcribed.json, calculator-audit.selected-fields.json, receipt.json y manifest SHA. **READONLY_DIAGNOSIS_COMPLETE / STOP.**
