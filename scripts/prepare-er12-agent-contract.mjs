// Offline ER12 preparation. Never connects to n8n or an AI provider.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const root = new URL('../', import.meta.url);
export const baselinePath = 'docs/evidence/pcram-family-die-prepared-2026-10-10/publication-er11-api-2026-10-10/published.api-export.json';
export const out = new URL('docs/evidence/pcram-er12-agent-contract-2026-10-10/', root);
export const sha = s => createHash('sha256').update(s).digest('hex');
export function prepare() {
  const baseline = JSON.parse(fs.readFileSync(new URL(baselinePath, root), 'utf8'));
  assert.equal(baseline.versionId, '7739824e-8248-4e7e-8534-72a96d7004d0');
  assert.equal(baseline.nodes.length, 12);
  const agent = baseline.nodes.find(n => n.name === 'Agente Despachante');
  const before = agent.parameters.options.systemMessage;
  assert.equal(sha(before), '0764c384010bb6bd69b56a8b69bb4ce54209a428f532237be3adb56fb3b912b7');
  const toolCode = baseline.nodes.find(n => n.name === 'Consulta_nomenclador_PCRAM').parameters.jsCode;
  assert.ok(toolCode.includes('terms.length > 8') && toolCode.includes('texto.length > 160'));
  const changes = [
    [
      'Los campos de entrada son indice, prefijo, texto y limite (1 a 8).',
      'Los campos de entrada son indice, prefijo, texto y limite. Contrato efectivo del buscador: indice entero de 1 a 100; limite entero de 1 a 8; texto de hasta 160 caracteres, con un máximo de 8 términos distintos de al menos 3 caracteres, excluidas las palabras funcionales reconocidas. Es una conjunción AND, no una búsqueda de sinónimos: cada término agregado debe coincidir. Para la primera consulta usá sólo de 1 a 3 términos genéricos en español realmente sustentados; no concatenes traducciones, sinónimos, marca, modelo y una lista de atributos. Los atributos originales se conservan para contrastar candidatos, no se descartan de la clasificación. Si existe un prefijo sustentado y no un término nomenclador útil, consultá ese prefijo con texto vacío. No envíes una consulta que exceda el contrato.'
    ],
    [
      'preferí el prefijo de la familia sustentada con texto vacío;',
      'si el primer intento ya tenía un prefijo sustentado, conservá ese prefijo y usá texto vacío; si sustentaste una familia después, usá su prefijo con texto vacío;'
    ],
    [
      'Antes de devolver NCM8 o SIM, asegurate de que ese código exacto esté entre los candidatos devueltos para ese producto.',
      'Antes de devolver NCM8 o SIM, asegurate de que ese código exacto esté entre los candidatos devueltos para ese producto y de que los atributos observados justifiquen las condiciones de su descripción/contexto. La pertenencia al resultado es necesaria pero no suficiente. Los atributos que distinguen NCM8 son obligatorios también cuando SIM=null: si declarás que falta composición, tecnología u otro atributo que distingue ese NCM8, no devuelvas ese NCM8 como sustentado. Conservá únicamente el HS4/HS6 independientemente sustentado o null; no recortes un código elegido para aparentar validación. Con partial=true, varios resultados del mismo NCM8 no acreditan que otras aperturas no existan. Revisá esta coherencia entre clasificacion, evidencia y fundamento antes de entregar la salida.'
    ],
  ];
  let after = before;
  for (const [from, to] of changes) {
    assert.equal(after.split(from).length, 2, 'Baseline phrase is not unique');
    after = after.replace(from, to);
  }
  const patch = {nodeId:agent.id,nodeName:agent.name,field:'parameters.options.systemMessage',
    beforeSha256:sha(before),afterSha256:sha(after),value:after};
  const rollback = {...patch,beforeSha256:sha(after),afterSha256:sha(before),value:before};
  const candidate = structuredClone(baseline);
  candidate.nodes.find(n => n.id === agent.id).parameters.options.systemMessage = after;
  return {baseline,candidate,before,after,changes,patch,rollback};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const p = prepare(); fs.mkdirSync(out, {recursive:true});
  const write = (name, value) => fs.writeFileSync(new URL(name, out), value);
  for (const [name,value] of [['apply.patch.json',p.patch],['rollback.patch.json',p.rollback]])
    write(name, JSON.stringify(value,null,2)+'\n');
  write('prompt.before.txt',p.before); write('prompt.after.txt',p.after);
  write('manifest.json',JSON.stringify({baselinePath,baselineVersion:p.baseline.versionId,nodeCount:12,
    beforeSha256:p.patch.beforeSha256,afterSha256:p.patch.afterSha256,
    exactChangedPaths:['/nodes/4/parameters/options/systemMessage'],
    baselineArtifactSha256:sha(fs.readFileSync(new URL(baselinePath,root))),
    frozenHashes:Object.fromEntries(p.baseline.nodes.filter(n=>n.name!=='Agente Despachante')
      .map(n=>[n.name,sha(JSON.stringify(n))])),
    changes:p.changes,productionMutations:0,modelCalls:0,
    state:'LOCAL_PREPARADO; AGENT_BEHAVIOR_AND_REAL_E2E_NOT_VERIFIED'},null,2)+'\n');
  console.log(JSON.stringify({field:p.patch.field,before:p.patch.beforeSha256,after:p.patch.afterSha256,
    nodeCount:12,productionMutations:0,modelCalls:0}));
}
