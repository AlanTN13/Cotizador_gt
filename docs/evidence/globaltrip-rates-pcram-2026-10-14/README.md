# GlobalTrip — nuevas tarifas courier + consultas PCRAM por familia (14/10/2026)

**Estado: CAMBIO EN RAMA TÉCNICA / PATCH LOCAL NO EJECUTADO / TESTS PENDIENTES / PRODUCCIÓN SIN CAMBIOS POR ESTA ENTREGA.**

Solicitud aprobada por Alan con foto de tarifas nuevas entre paréntesis (Excel anterior desactualizado); [ER12 GO 6171461191](https://github.com/AlanTN13/Cotizador_gt/issues/12#issuecomment-6171461191) y AlanOS son fuente de decisión.

## Delta acotado

- Tarifa courier **flete internacional** sobre peso aplicable vigente (máximo de peso real/volumétrico redondeado a 0,5 kg): `<=20 kg: 26.88 USD/kg` (antes 24), `>20 y <=30 kg: 22.40 USD/kg` (antes 20), `>30 kg: 21.28 USD/kg` (antes 19). El límite técnico actual deja 20,5 kg en el segundo tramo; sin cambio de fronteras ni nueva regla comercial. Los nuevos importes **no llevan recargo adicional del 12%**. No validar contra el Excel viejo.
- Prompt PCRAM: investigar un NCM8 argentino sustentado y consultar directo cuando exista; si devuelve `NO_MATCH`, usar el segundo y último intento en una familia HS4/HS6 respaldada. **Si sólo hay familia identificada, consultar PCRAM por producto igualmente**: `vista=ramas` para familia grande/desconocida como 9503/950300 (481SIM/15NCM), `vista=detalle` para familia acotada que cabe entera; NCM8 dirigido sólo con atributos verificados. Conservar parcial HS4/HS6/SIMnull, máximo 2 consultas/producto, maxIterations=8. No inventar tasas ni fuentes; guard y TaxResolver intactos.
- Frontend: cambiar **sólo leyenda de tarifa en QA** `Escala China 26,88 / 22,40 / 21,28`; no modificar presentación comercial ni cálculos web.

### Cambios fuente en esta rama

- `workflow/pcram-web-directed-instructions.txt`: texto de estrategia del agente (fuente para reconstruir el systemMessage de producción).
- `lib/courier/calculation-detail.ts`: texto de rango mostrado en desglose QA.
- `scripts/prepare-globaltrip-rates-pcram.mjs`: **preparador local**, reconstruye candidato publicado del historial probado, exige hashes conocidos e inserta exactamente dos cambios n8n (systemMessage agente y tarifa del calculador). Nunca hace requests externos. Produce `patch.recipe.json` con precondiciones y receta inversa para rollback, en esta carpeta, sólo cuando se ejecuta.
- `tests/globaltrip-rates-pcram.test.mjs`: controles offline de pesos19/20/20,01/20,5/21/29/30/30,01/30,5/31, cálculo del flete, invariancia CIF/impuestos/handling, 12 nodos/fields, prompt por producto y etiqueta QA.

**No se modificó** `workflow/workflow-source.mjs` de V1 histórica (no representa fielmente el calculador packed/n8n productivo actual); ni datasets, PCRAM Tool, guard, `FAMILY_SNAPSHOT`, TaxResolver, handling, flete aduanero, seguro, CIF, IVA, gateway o modelo.

## Antes de afirmar LOCAL PASS

En un checkout limpio de esta rama, con Node24, ejecutar:

```sh
node scripts/prepare-globaltrip-rates-pcram.mjs
node --test tests/globaltrip-rates-pcram.test.mjs
```

Ambos comandos deben terminar sin errores. Registrar commit exacto, hashes resultantes y prueba. El preparador **falla cerrado** si los SHA de prompt publicado, validador, parser o calculador no coinciden o si la expresión de la tarifa no aparece exactamente una vez. No afirmar eficacia real de Web Search/modelo por fixtures.

## Gate productivo separado

Última versión n8n acreditada `f25077ba-8c75-49a5-99f2-8473a70d1fd9` (12 nodos); frontend acreditado `e011ce4` en `dpl_Df7uEi2XJWVuUUptA97bVU326nXX`. Son **referencias históricas**, no preflight vivo. Antes de tocar Cloud: GET autenticado/versión/hashes de n8n, backup privado fresco, comparación congelados y rollback listo; al mínimo delta externo, STOP. La receta del preparador **no se ejecuta contra Cloud automáticamente**. Para web, preparar un parche de un solo archivo QA sobre el baseline vivo, no desplegar toda la rama técnica.

**Ninguna publicación nueva, cotización real o llamada IA fue autorizada ni ejecutada por estos cambios.** Pendiente de test local del candidato y autorización productiva separada.
