# Tax Resolver sobre el circuito n8n existente

## Execution preflight — 2026-09-22

Rol/superficie: ejecución autorizada en tarea desktop, un escritor. Base productiva verificada: `codex/globaltrip-form-n8n` / `38c52a72abecdbfc87aaf1893751c67d87b53749`, deployment `dpl_SjiEr29QYpGEkF8Bipa8e9FoGMRA`. AlanOS `0b40aa3`, contrato runtime y hogar/delta GlobalTrip consultados.

Resultado autorizado: integrar únicamente resolución DIE/TE/IVA posterior al agente existente. Mantener formulario, diseño, gateway n8n, registro y fórmulas logísticas. No publicar hasta mostrar delta y validación a Alan. No reconstruir flujo ni promover la preview de PR#1.

Budget M / T2 / R2, diseño A1 local: adaptar resolver y empaquetarlo dentro del Code Node de cálculo existente. Sin nuevos servicios, rutas ni credenciales. Snapshot Git productivo es base; contraste con export vivo obligatorio antes de aplicar patch en n8n. No sustituir un workflow vivo por JSON completo.

Capacity: contexto acotado a funciones/prompt/contrato/generador y pruebas; un implementador, sin agentes; pruebas focalizadas + suite/tipado/build final. Reservar margen para conflictos del contrato y regresiones. STOP ante divergencia viva material no reconciliada. Recuperación: restaurar código anterior del único nodo afectado y versión activa previa; no borrar ejecuciones ni recibos.

Aceptación: tasas por producto con fuente/versión, tasas cero/reducidas y fallback explícito, revisión material compatible con la respuesta pública actual, fórmula de IVA correcta con tratamientos mixtos, igualdad de rutas/formulario/agente/conexiones/registro y logística. No se amplía a percepciones, Ganancias ni internos. Débitos/créditos preexistentes se conservan como parte de la fórmula actual, sin crear política fiscal nueva.

## Delta final

Base: rama realmente usada por producción, `codex/globaltrip-form-n8n` / 38c52a7. Rama de entrega: `codex/tax-resolver-n8n`. PR#1 es fuente de lógica/datos, no base de publicación.

- `workflow-source.mjs`: después de la salida del agente, resuelve tasas por producto; el motor conserva FOB, peso físico/volumétrico, escalas 24/20/19, handling 75+IVA, flete aduanero, seguro y recargo de débitos/créditos existentes. IVA se calcula sobre CIF+derechos+TE de cada producto antes de sumar, evitando multiplicar promedios de tasas incompatibles.
- `tax-adapter.mjs`: adapta SIM/NCM/DIE del agente actual al resolver existente. Prioridad de fuentes específicas, incluidos ceros y reducciones; el DIE individual del agente queda como estimación si no hay coincidencia. Si identifica razonablemente un producto sin posición completa, conserva su estimación sin inventar códigos. TE/IVA generales sólo son fallback explícito/versionado. Un SIM/NCM contradictorio, una NCM con tratamientos incompatibles o identificación mínima ausente devuelve `codigo: REQUIERE_REVISION` dentro de `status: error`, que ya entiende el formulario.
- Trazabilidad dentro de `auditoria`: posiciones, tasas, fuentes/versiones/hash/página, resultado original del agente, métodos, advertencias y tributos por producto. El gateway sigue filtrando esa auditoría antes del navegador; permanece disponible en la ejecución de n8n y cualquier registro existente que ya reciba esa respuesta. No se añadió un registro ni se afirma persistencia nueva fuera de ese recorrido.
- Se reutilizan sin modificación `lib/courier/tax-resolver.ts`, PDF Germán, snapshot de 32.978 SIM, IVA separado y política referencial de 4488600. Sin scraping tributario en runtime. El agente conserva sus herramientas existentes.
- Export JSON: **sólo cambia `Cotizador deterministico.parameters.jsCode`**. Nodos, IDs, conexiones, prompt, modelo, schema, settings y metadatos permanecen idénticos. El generador ya no reconstruye el workflow; actualiza ese código y genera runtime/manifest determinísticos.
- `patch-n8n-tax-resolver.mjs` prepara un archivo candidato desde un export vivo, preservando inclusive nodos de registro y credenciales que no estén en la referencia Git. Rechaza cambios no revisados en calculador o contrato del agente. No llama a n8n, no importa ni publica.
- CI alcanza la base productiva y verifica regeneración sin diferencias, tests y build.

Comparación Git vacía para `app/`, `components/`, `public/`, gateway, registro, service, Apps Script, catálogo operativo y prompt. No se copiaron motor general, formulario, cinco perfiles/gates ni tarifario de la preview anterior.

## Validación

**124 PASS, 2 live SKIP, 0 FAIL**; TypeScript y build Next aprobados. Los tests ejecutan el JavaScript literal empaquetado del Code Node en una VM sin red, no sólo una función equivalente. [Reporte](evidence/tax-n8n/tests.json), [build](evidence/tax-n8n/build.txt), [casos](evidence/tax-n8n/cases.json).

| Caso | DIE | TE | IVA | Resultado tributario |
|---|---:|---:|---:|---|
| Ventilador 84145190100R | 20% | 3% | 21% | Específico |
| Remera 61091000190Z | 20% | 3% | 21% | Específico |
| Cuchara 82159910130F | 18% | 3% | 21% | Específico |
| LED 85395200900Z | 20% | 3% | 21% | Específico |
| Taza 69120000191F | 20% | 3% | 21% | Específico |
| Notebook 84713012991G | 16% | 0% | 10,5% | Específico |
| Router 85176241100N | 0% | 0% | 10,5% | Específico |
| Smartphone 85171300000C | 8% | 0% | 21% | IVA general estimado |
| Repuesto identificado sin NCM completa | 14% del agente de prueba | 3% | 21% | Estimado con fuentes/supuestos |
| NCM 21069090 con tasas incompatibles | — | — | — | REQUIERE_REVISION |

También: mezcla fan/router con IVA por base individual, diez productos, prioridad de fuentes ante DIE del agente más alto, SIM desconocido con NCM homogénea, contradicción NCM/HS/SIM, condición Courier explícita, vencimiento legal del fallback, revisión técnica del snapshot, 28 comparaciones de regresión de fórmulas/logística contra el cálculo anterior, integridad PDF/filas y patch idempotente que conserva registro/credenciales/settings e impide aplicar sobre un contrato distinto. Gateway y suites de registro/idempotencia originales siguen verdes.

## Límites y publicación pendiente

- El formulario aporta FOB total sin valores por producto. Se mantiene reparto de CIF en partes iguales, equivalente al promedio de DIE anterior; ahora está identificado en auditoría. No se declara un reparto basado en valores individuales inexistentes.
- Las diez entradas son sintéticas, con clasificación suministrada. Validan resolución y cálculo, no aciertos nuevos del modelo ni aceptación aduanera por Germán. Los tests vivos optativos no se ejecutaron; cero llamadas nuevas a OpenAI/n8n, cero escrituras de solicitudes reales.
- No se amplía la clasificación/elegibilidad del agente. Se respetan impedimentos explícitos si están presentes; no se promete detección exhaustiva que el agente actual no ofrece.
- Base productiva acreditada por Vercel/Git; todavía no se contrastó el export del workflow **vivo** de n8n. Antes de publicar, exportar su versión activa, aplicar el guard, revisar un único cambio de código y ejecutar smoke controlado del nodo. Si difiere el contrato, detener y reconciliar; no importar el JSON de distribución completo sobre producción.
- No existe nuevo despliegue n8n ni promoción Vercel. El preview automático de Git, si existe, sólo prueba build de la web sin alterar el workflow vivo. Un merge o preview web no activa esta mejora tributaria.
- **Aprobación final de Alan pendiente**, por instrucción explícita del 22/09. Mostrar delta/pruebas primero. Recuperación futura: código anterior del nodo/versión activa exportada, sin tocar registros ni conexiones.


## Contraste vivo y smoke acotado — checkpoint del 22/09

Export del workflow activo `LO9m0AxSrxRR6JVY` descargado desde n8n y conservado temporalmente fuera del repositorio. El código de todos los Code Nodes coincide byte por byte con la base usada. El export de n8n omite valores por defecto: `mode=runOnceForAllItems` en nodos Code, `responsesApiEnabled=true` (confirmado visualmente en el editor) y `autoFix=false`; también ordena de otro modo campos del agente y omite ajustes de exportación que quedan intactos. La guarda normaliza exclusivamente esas representaciones. El candidato generado desde el export vivo cambia sólo `Cotizador deterministico.parameters.jsCode`; IDs, conexiones, credenciales, estado activo, registro y settings coinciden exactamente. SHA256 del código nuevo: `dd4025573c1154b46e79d41c587c4cc24ed8b089b56a5de896e1d3a9dc42ce50`. El workflow vivo aún no fue modificado.

Fixture aislado de smoke `tests/fixtures/n8n-smoke-workflow.json`: trigger manual + entrada sintética (notebook/router) + código literal del nodo candidato, sin credenciales, webhook, registro ni publicación. Se usa para probar el runtime de n8n sin tocar el circuito activo. El resultado esperado offline es COTIZADO USD 674,96 total / USD 200,21 tributos, tasas notebook 16/0/10,5 y router 0/0/10,5. No representa una cotización comercial ni valida el agente vivo.


### Resultado del smoke en n8n

El 22/09 se importó sólo un harness de 3 nodos **sin publicar** en [SMOKE GlobalTrip Tax Resolver](https://nexops.app.n8n.cloud/workflow/nYV4JHVBcFjUkSFD/2ad5c5?projectId=9kElEcXnGLfAYokj). Contiene trigger manual, entrada sintética y el **código exacto** del calculador candidato (SHA256 `dd4025573c1154b46e79d41c587c4cc24ed8b089b56a5de896e1d3a9dc42ce50`); no tiene webhook, credenciales, registro ni agente. n8n mostró **Workflow executed successfully** y el Output JSON confirmó `status=cotizado`, total **USD 674,96**, tributos **USD 200,21**, peso considerado 16 kg. Tasas trazadas: notebook SIM `84713012991G` DIE16/TE0/IVA10,5 y router SIM `85176241100N` DIE0/TE0/IVA10,5, ambos `RESUELTO`; agente sintético había propuesto DIE35 a cada uno, por lo que el smoke comprueba prioridad del resolver. `reglas_version=globaltrip-tax-resolver-2026-09-22`. Coincide con el resultado offline de la misma entrada. [Receipt estructurado](evidence/tax-n8n/live-gate-2026-09-22.json).

El workflow activo de GlobalTrip `LO9m0AxSrxRR6JVY` permanece Published y sin ediciones. No hubo llamada a OpenAI, webhook, registro ni cotización real. Este smoke acredita la ejecución del calculador dentro de n8n, no un recorrido completo desde el formulario/agente. Rollout general sigue pendiente de aprobación explícita.

El export activo tiene 11 nodos y **no contiene un nodo de registro**. Por eso el contraste prueba que el workflow y sus conexiones no cambiaron; la conservación del registro externo se acredita por la ausencia de cambios en gateway/Apps Script, no por un smoke de persistencia real.

## Intento de publicación y rollback — 2026-09-22

Alan autorizó aplicar y publicar exclusivamente `Cotizador deterministico`, hacer un smoke corto desde el formulario productivo y revertir inmediatamente ante una diferencia material. Se exportó de nuevo el workflow vivo antes de editar; coincidió byte por byte con el export del gate anterior (SHA256 `860315e9224da265d2a61f50a3d1ae90fc030cc33120bbc684ada7ce98cc6b6e`). La guarda volvió a aceptar sólo el cambio del calculador. Se cargó el código exacto del smoke aislado y se comprobó íntegro antes de publicar (SHA256 `dd4025573c1154b46e79d41c587c4cc24ed8b089b56a5de896e1d3a9dc42ce50`). El export del draft de n8n difirió de la base únicamente en `nodes.9.parameters.jsCode` y `versionId` generado por n8n. Se publicó como `Tax Resolver V1 — DIE/TE/IVA por producto`, versión `9bd5a591-95e0-4e6c-a711-b1064a4b9225`.

Smoke real en `https://cotizador.globaltriplog.com/cotizador`: notebook sintética descrita en texto, FOB USD 500, un bulto de 3 kg y 40×30×10 cm. El formulario aceptó los datos y mostró la pantalla de procesamiento, pero luego devolvió **“El cotizador necesita completar su autenticación. Tus datos se conservan para reintentar.”** El gateway productivo mapea ese mensaje a `N8N_AUTH_REQUIRED` cuando el webhook responde HTTP 401/403. La lista del workflow no mostró ejecución nueva del 22/09; la más reciente seguía siendo del 17/09. Por tanto, el intento no llegó al agente, calculador ni registro, y no acredita el E2E solicitado. No se modifica ninguna credencial ni gateway en esta entrega.

Por la condición de rollback, se republicó inmediatamente la versión previa `0743ce69-1e68-418d-b635-6d3674d0d428`, se restauró también el draft y se publicó la restauración como `Rollback — base previa Tax Resolver`, versión `0a3f40e7-448e-4411-a6a1-5bf3d4049398`. El export final activo tiene `active=true` y es idéntico al backup previo en todos los campos salvo ese `versionId`; el código anterior del calculador volvió a SHA256 `3869f15735439e869fdcb4f2e14d11964089f3b887d3608b9db9c91da785ee7a`. n8n muestra `Published`. **La mejora no permanece activa.** PR#2 sigue draft, sin merge; el bloqueo real para un nuevo rollout es resolver el rechazo de autenticación entre gateway productivo y webhook y repetir el smoke E2E con agente/registro verificables.

## Recuperación del baseline de autenticación — 2026-09-22

Se contrastaron las versiones históricas `0743ce69-1e68-418d-b635-6d3674d0d428` y `533ad8e4-11f8-4b77-991e-2e977c20e178`. Ambas asignan a `Formulario - POST` la credencial existente `Header Auth account 2`, ID `3CkSedfe5fMljbdt`; la referencia publicada actual es exactamente la misma. No se creó, rotó ni probó otra credencial y no se tocó Vercel.

Se ejecutó el único request sintético autorizado con el calculador anterior: notebook, FOB USD 500, un bulto de 3 kg y 40×30×10 cm. El formulario volvió a responder `N8N_AUTH_REQUIRED` y n8n no registró una ejecución nueva; la última visible siguió siendo la ejecución exitosa `29844` del 17/09. El baseline no quedó recuperado. No se aplicó ni publicó `Cotizador deterministico` de PR #2 y no fue necesario rollback porque el workflow productivo no se modificó. La contradicción concreta es que la referencia histórica conocida buena ya está asociada, pero su autenticación efectiva dejó de coincidir con el gateway; corregir valores/variables excede el alcance impuesto. [Receipt estructurado](evidence/tax-n8n/auth-baseline-recovery-2026-09-22.json).
