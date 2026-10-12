// Offline only. Generates field-scoped candidate and recovery; never publishes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const root = new URL('../', import.meta.url);
export const out = new URL('docs/evidence/pcram-coverage-local/', root);
export const baselinePath = 'docs/evidence/pcram-family-die-prepared-2026-10-10/publication-er11-api-2026-10-10/published.api-export.json';
export const sha = x => createHash('sha256').update(x).digest('hex');
const read = x => fs.readFileSync(new URL(x, root), 'utf8');
const embed = x => x.replace(/^import[^\n]+\n/, '').replaceAll('export function', 'function');
export function prepare() {
  const baseline = JSON.parse(read(baselinePath)), candidate = structuredClone(baseline);
  assert.equal(baseline.nodes.length, 12);
  const tool = candidate.nodes.find(n => n.name === 'Consulta_nomenclador_PCRAM');
  const agent = candidate.nodes.find(n => n.name === 'Agente Despachante');
  assert.equal(sha(agent.parameters.options.systemMessage), '0764c384010bb6bd69b56a8b69bb4ce54209a428f532237be3adb56fb3b912b7');
  for (const file of ['workflow/pcram-nomenclator-packed.mjs', 'workflow/pcram-tool-input.mjs']) {
    const before = embed(execFileSync('git', ['show', `d91415a:${file}`], {cwd:fileURLToPath(root), encoding:'utf8'}));
    assert.equal(tool.parameters.jsCode.split(before).length, 2, `Unique frozen anchor: ${file}`);
    tool.parameters.jsCode = tool.parameters.jsCode.replace(before, embed(read(file)));
  }
  const validator = candidate.nodes.find(n => n.name === 'Validar salida del agente');
  const guardFile = 'workflow/pcram-classification-guard.mjs';
  const guardBefore = embed(execFileSync('git', ['show', `d91415a:${guardFile}`], {cwd:fileURLToPath(root), encoding:'utf8'}));
  assert.equal(validator.parameters.jsCode.split(guardBefore).length, 2, 'Unique frozen guard anchor');
  validator.parameters.jsCode = validator.parameters.jsCode.replace(guardBefore, embed(read(guardFile)));
  const schema = JSON.parse(tool.parameters.inputSchema);
  schema.properties.vista = {type:'string', enum:['ramas','detalle'], description:'ramas: todas las NCM con contexto íntegro disponible; detalle: todas las SIM coincidentes. Máximo fijo 64 registros/65536 bytes; si no caben no se muestra una muestra. Sin offsets.'};
  schema.properties.limite.description = '1..8, contrato legacy. Si vista está presente, el límite de filas pasa a ser el presupuesto fijo 64/65536 de la vista completa; este campo se conserva para compatibilidad.';
  tool.parameters.inputSchema = JSON.stringify(schema);
  tool.parameters.description += ' Preferir vista=ramas con prefijo sustentado y texto vacío, después vista=detalle de una NCM observada. Vistas completas hasta 64 registros/65536 bytes; no hay páginas ni offsets. Si no cabe todo, no devuelve subconjunto y declara retrieval.complete=false. branches no acredita NCM/SIM.';
  const before = agent.parameters.options.systemMessage;
  const start = before.indexOf('Los campos de entrada son indice, prefijo, texto y limite (1 a 8).');
  const end = before.indexOf('\nLa consulta devuelve códigos existentes', start);
  assert.ok(start >= 0 && end > start);
  const instructions = 'Los campos obligatorios siguen siendo indice, prefijo, texto y limite (1 a 8); se agrega vista: ramas o detalle. Cuando vista está presente, la herramienta devuelve el conjunto completo dentro de un presupuesto fijo de 64 registros y 65536 bytes, independientemente de limite; si no cabe, no muestra un subconjunto y declara retrieval.complete=false con la causa. No existen offsets ni páginas. Máximo dos consultas por producto, incluidos reintentos; nunca hagas una tercera. maxIterations=8 permanece sin cambios. Si hay una familia sustentada, primera llamada vista=ramas con ese prefijo y texto vacío: no gastes la llamada en concatenar palabras comerciales. Si no hay prefijo sustentado, usá sólo un término genérico verificable del producto; texto es AND, hasta 160 caracteres y ocho términos distintos de al menos tres caracteres, excluidas palabras funcionales reconocidas. No inventes prefijos para evitar NO_MATCH. El panorama contiene contexto literal íntegro disponible y counts, no una clasificación ni jerarquías reconstruidas. Con retrieval.complete=true, contrastá las condiciones completas de las ramas con los atributos observados y, si alguna está sustentada, segunda llamada vista=detalle con su NCM observada, texto vacío y el mismo indice. El detalle devuelve todas sus SIM que quepan, incluidas las últimas; no elijas la primera ni una apertura residual por descarte. Si faltan atributos para elegir rama, segunda llamada vista=detalle al HS4/HS6 independientemente sustentado para conservar evidencia de familia y clasificación parcial. Si la primera dio NO_MATCH, el único reintento puede ser detalle de la familia independientemente sustentada o del término principal verificable; si no cabe todo o sigue sin coincidencias, conservá parcialidad sin buscar un código externo. No reintentes INVALID_QUERY ni errores. Con retrieval.complete=false no hay candidatos precisos acreditados: declaralo y refiná sólo si resta una llamada y hay atributos que lo justifiquen; si no, HS4/HS6 sustentado o null, SIM=null. No confundas encabezados generales con condiciones específicas ni partes/accesorios con producto completo. No declares atributos o consultas no observados. Los indicadores de campo de origen lleno señalan posible truncamiento: no completes texto faltante; una SIM marcada no puede ser acreditada, aunque la rama tenga contexto íntegro disponible.';
  agent.parameters.options.systemMessage = before.slice(0,start) + instructions + before.slice(end);
  agent.parameters.options.systemMessage = agent.parameters.options.systemMessage.replace(
    'Antes de devolver NCM8 o SIM, asegurate de que ese código exacto esté entre los candidatos devueltos para ese producto.',
    'Antes de devolver NCM8 o SIM, asegurate de que ese código exacto esté en results de una consulta dirigida vista=detalle con retrieval.complete=true para ese producto, y que los atributos observados sustenten las condiciones específicas. branches nunca acredita códigos. Si falta composición, tecnología, material u otro atributo decisivo, no devuelvas la apertura que lo exige, aunque aparezca en results; conservá únicamente el nivel parcial independientemente sustentado.');
  const changes = [];
  for (const [name,fields] of [['Consulta_nomenclador_PCRAM',['jsCode','inputSchema','description']],['Agente Despachante',['options.systemMessage']],['Validar salida del agente',['jsCode']]]) {
    const index = candidate.nodes.findIndex(n=>n.name===name);
    for (const field of fields) {
      const get = w => field.split('.').reduce((o,k)=>o[k],w.nodes[index].parameters);
      changes.push({nodeId:candidate.nodes[index].id,path:`/nodes/${index}/parameters/${field.replaceAll('.','/')}`,before:get(baseline),after:get(candidate),beforeSha256:sha(get(baseline)),afterSha256:sha(get(candidate))});
    }
  }
  const restored = structuredClone(candidate);
  for (const c of changes) {const keys=c.path.split('/').slice(1);const key=keys.pop();keys.reduce((o,k)=>o[k],restored)[key]=c.before;}
  assert.deepEqual(restored,baseline);
  return {baseline,candidate,changes,instructions};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p=prepare();fs.mkdirSync(out,{recursive:true});
  const manifest={status:'LOCAL_COMPLETE_VIEWS_PREPARED_NOT_AGENT_VERIFIED',baselinePath,
    baselineArtifactSha256:sha(read(baselinePath)),baselineSavedVersion:p.baseline.versionId,
    lastRecordedRollbackVersion:'9a87b6f0-4f1f-41ab-8530-68419b48b1d3',freshLiveRead:false,
    note:'Saved ER11 functional baseline; ER12 receipt records prompt-only recovery to this content. Future publication needs fresh live identity/content verification.',
    changedPaths:p.changes.map(c=>c.path),frozenSurfacesIdentical:true,scopedRecoveryExact:true,
    toolBytes:Buffer.byteLength(p.candidate.nodes.find(n=>n.name==='Consulta_nomenclador_PCRAM').parameters.jsCode),
    productionMutations:0,modelCalls:0};
  for(const [name,obj] of Object.entries({'manifest.json':manifest,'apply.patch.json':{neverImportWholeWorkflow:true,changes:p.changes},'rollback.patch.json':{requireFreshCandidateHashes:true,changes:p.changes.map(c=>({...c,before:c.after,after:c.before,beforeSha256:c.afterSha256,afterSha256:c.beforeSha256}))}}))fs.writeFileSync(new URL(name,out),JSON.stringify(obj,null,2)+'\n');
  fs.writeFileSync(new URL('prompt.after.txt',out),p.candidate.nodes.find(n=>n.name==='Agente Despachante').parameters.options.systemMessage);
  console.log(JSON.stringify(manifest,null,2));
}
