# Evaluación real de los cinco ejemplos

Los cinco ejemplos recibidos el 11/09/2026 constituyen los resultados funcionales esperados de esta evaluación. No hace falta documentación adicional para ejecutar estas pruebas.

| Producto descrito | SIM esperado completo | DIE esperado | Error a detectar |
| --- | --- | --- | --- |
| Ventilador de pie 50 W, caño extensible | 8414.51.90.100R | 20% | Perder el detalle de caño extensible |
| T-shirt de punto 100% algodón, adulto M | 6109.10.00.190Z | 20% | Usar AEC 35% como DIE |
| Cuchara de té íntegramente de acero inoxidable | 8215.99.10.130F | 18% | Detenerse en NCM de ocho dígitos |
| LED E27 9 W residencial | 8539.52.00.900Z | 20% | Usar AEC 10,80% como DIE o variante automotriz |
| Taza individual de gres apta para alimentos | 6912.00.00.191F | 20% | Confundir porcelana, juego o condición de contacto alimentario |

## Qué se corrigió

El catálogo estaba vacío y el agente no tenía variantes entre las cuales elegir. Se incorporaron los cinco perfiles con sus características y los SIM/DIE aportados. Los nombres alternativos son genéricos: no se copió el texto del examen dentro del catálogo.

Una prueba negativa detectó que proponía el ventilador de pie para uno de mesa explícitamente sin columna. Se ajustó la selección para descartar variantes contradictorias. También se corrigieron solicitudes de datos ya presentes y se alinearon los límites de las listas de respuesta entre el contrato enviado a OpenAI y el validador local. El intérprete pasa a `product-interpreter-2` y el catálogo a `2026-09-11.functional-examples.1`.

## Qué mide la prueba

- Proveedor real OpenAI, modelo configurado `gpt-4.1-mini`, sin mocks.
- Entrada: las cinco descripciones originales, sin sus respuestas SIM/DIE. El modelo recibe nombres, alias y características de los perfiles; no recibe sus códigos ni impuestos.
- Se compara el perfil elegido con el SIM completo y DIE esperados. Las tasas provienen del catálogo: esto evalúa selección de perfiles, **no extracción de impuestos de un PDF ni clasificación universal independiente**.
- Prueba negativa: ventilador de mesa sin columna, T-shirt de poliéster, cuchara con mango plástico, LED automotriz y taza de porcelana. Ninguno debe recibir uno de los cinco perfiles.
- Se exige `missing` vacío para los ejemplos completos y ausencia de precio comercial para el envío.
- Se evalúa con descripción completa. No se certificó en esta tanda la lectura automática de los enlaces de Alibaba.

## Resultado verificado

- Descripciones originales: **5/5** perfiles y SIM/DIE coincidentes; sin solicitudes de datos adicionales.
- Variantes negativas: **5/5** sin asignación de un perfil incompatible.
- Pruebas automáticas: **55 aprobadas**, dos pruebas reales optativas omitidas en la ejecución normal.
- Compilación y tipado: aprobados.
- Evidencia: `evidence/eval-five-final.json` y `evidence/eval-five-negative-final.json`.

## Cobertura y pendientes

La cobertura de reconocimiento se limita a las cinco variantes detalladas. La aptitud courier, las demás tasas y el tarifario siguen pendientes de validación funcional. Los perfiles tienen `approval: null`, `decision: review`, tributos desconocidos en `null` y no existe tarifa logística. Reconocer el perfil no autoriza cotizar; el motor conserva `REQUIERE_REVISION` sin precio.

Los valores suministrados son el patrón de comparación de esta etapa. Su vigencia normativa no fue contrastada de manera independiente. Antes de habilitar precios, Germán debe validar el conjunto de reglas de liquidación y aptitud indicado en `COURIER-V1.md`; no se requiere repetir los ejemplos.

## Reproducir

Pruebas normales: `npm test`. Incluyen conservación de SIM/DIE completo, bloqueo de precio para los cinco perfiles y ausencia de respuestas arancelarias en el mensaje a OpenAI.

Pruebas reales optativas (requieren la conexión de OpenAI ya configurada):

```sh
COURIER_FUNCTIONAL_LIVE=true COURIER_EVAL_REQUIRE_MATCH=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/functional-classification.live.test.ts
COURIER_FUNCTIONAL_LIVE=true COURIER_EVAL_REQUIRE_MATCH=true COURIER_EVAL_NEGATIVE=true node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/functional-classification.live.test.ts
```

`COURIER_EVAL_REPORT` permite escribir el resultado JSON a un archivo local. Estas pruebas no envían correos ni escriben solicitudes en Sheets.

Referencia técnica del ajuste de formato: [Structured Outputs — límites de arrays](https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas).
