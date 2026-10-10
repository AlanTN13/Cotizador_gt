# ER #9 — DIE familia 6109

**PASS local / DIE_UNIFORME_VERIFICADO / STOP.** Las 10 SIM bajo6109 del snapshot tributario congelado tienen DIE20%; ninguna tiene16%. Cobertura completa10/10 contra el índice de clasificación existente. No se asigna SIM a la camiseta ni se implementa fallback.

## Fuente y método

Se extrajo por lectura JSON el objeto `../../data/tax-die-te.json` incrustado en el Code Node del export publicado guardado, versión `daaff0aa-7fc3-4f01-960a-2a9427531bc1`. Coincide exactamente con el dataset local existente. Contraste de cada valor contra `die_extrazona_pct` del snapshot original (no AEC). Sin ejecutar el calculador, cotizaciones ni pruebas del agente.

Snapshot tributario `pcram-die-te-fd04e2344db6-v1`, ZIP SHA256 `fd04e2344db684fef46e5fd65d6c8c384fc2ce220054fe063c24f2fd629663eb`, captura `2026-09-30T14:42:53.148482Z`, 33030 registros. `effectiveDate=null`; la fecha por registro es actualización, no certificación de vigencia legal.

El índice de clasificación corresponde a otro ZIP, `4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c`, registros actualizados01/10/2026. Se decodificó únicamente el shard6109 ya existente con checksum correcto; ambos conjuntos coinciden en las10SIM. No se actualizó ni descargó fuente alguna.

## Comparación completa

| SIM | DIE extrazona | Fecha registro tributario |
|---|---:|---|
| 61091000110Y | 20% | 2026-04-13 |
| 61091000190Z | 20% | 2026-04-13 |
| 61091000210D | 20% | 2026-04-13 |
| 61091000290E | 20% | 2026-04-13 |
| 61099000111N | 20% | 2026-04-13 |
| 61099000119F | 20% | 2026-04-13 |
| 61099000191P | 20% | 2026-04-13 |
| 61099000199G | 20% | 2026-04-13 |
| 61099000210R | 20% | 2026-08-07 |
| 61099000290T | 20% | 2026-04-13 |

Fuente común: `pcram-transfer`, snapshot indicado arriba. Descripciones literales, metadata, hashes completos y controles en [comparison.json](comparison.json).

## Conclusión y límites

La fuente respalda DIE20% para cada una de estas posiciones. No hay respaldo para DIE16% en ninguna de las10. Esto no convierte el20% estimado de #34404 en lookup verificado: #34404 y #34448 recibieron posición incompleta y registraron AGENT_ESTIMATE / dutyEvidence=null. La composición de la camiseta sigue sin acreditarse; no se certifica apertura arancelaria ni tasa específica para ese producto. No se deduce una regla global fuera de estas10posiciones.

Cero Cloud, cotizaciones, llamadasIA, descargasPCRAM o mutaciones productivas. Sólo evidencia documental; ningún código, índice, dato, prompt, fórmula o política cambiado. No requiere rollback porque no existe mutación funcional. STOP.
