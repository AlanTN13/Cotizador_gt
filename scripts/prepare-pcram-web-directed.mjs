// Offline field-scoped preparation only; no requests, models or deployment.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export const root = new URL('../',import.meta.url);
export const out = new URL('docs/evidence/pcram-web-directed-local-2026-10-13/',root);
const read = p => fs.readFileSync(new URL(p,root),'utf8');
export const sha = x => createHash('sha256').update(x).digest('hex');
const assign = (w,path,value) => {const keys=path.split('/').slice(1),key=keys.pop(); keys.reduce((o,k)=>o[k],w)[key]=value;};
export function prepare() {
 const baseline = JSON.parse(read('docs/evidence/pcram-family-die-prepared-2026-10-10/publication-er11-api-2026-10-10/published.api-export.json'));
 const oldPatch=JSON.parse(execFileSync('git',['show','5775193:docs/evidence/pcram-coverage-local/apply.patch.json'],{cwd:fileURLToPath(root),encoding:'utf8',maxBuffer:16*1024*1024}));
 for(const c of oldPatch.changes) {assert.equal(sha(c.before),c.beforeSha256);assign(baseline,c.path,c.after);assert.equal(sha(c.after),c.afterSha256);}
 assert.equal(baseline.nodes.length,12);
 const candidate=structuredClone(baseline);
 const agent=candidate.nodes.find(n=>n.name==='Agente Despachante');
 const before=agent.parameters.options.systemMessage;
 assert.equal(sha(before),'698f6ac6ef538a2811dd5ccae8dd802c86744a056f77d0178cca27588a0aebce');
 const start=before.indexOf('Consulta local al nomenclador:');assert.ok(start>0);
 agent.parameters.options.systemMessage=before.slice(0,start)+read('workflow/pcram-web-directed-instructions.txt');
 agent.parameters.options.systemMessage=agent.parameters.options.systemMessage.replace('elegí la variante más probable y un DIE estimado numérico','entregá un DIE estimado numérico');
 agent.parameters.options.systemMessage=agent.parameters.options.systemMessage.replace('No incluyas estados, precios, preguntas ni texto fuera del JSON.',
   'No incluyas estados, precios, preguntas ni texto fuera del JSON. Agregá únicamente verificacion por producto con codigo_candidato, familia_sustentada, atributos [{fuente,cita}] y motivo_aproximacion. No devuelvas etiquetas exacta/aproximada: las deriva el validador.');
 const parser=candidate.nodes.find(n=>n.name==='Salida estructurada');
 const schema=JSON.parse(parser.parameters.inputSchema),item=schema.properties.productos.items;
 item.properties.verificacion={type:'object',additionalProperties:false,properties:{
   codigo_candidato:{type:['string','null']},familia_sustentada:{type:['string','null']},
   atributos:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,properties:{fuente:{type:'string',maxLength:2048},cita:{type:'string',minLength:8,maxLength:1600}},required:['fuente','cita']}},
   motivo_aproximacion:{type:'string',maxLength:800}},required:['codigo_candidato','familia_sustentada','atributos','motivo_aproximacion']};
 // Optional for fail-safe compatibility with old valid agent responses.
 parser.parameters.inputSchema=JSON.stringify(schema);
 const validator=candidate.nodes.find(n=>n.name==='Validar salida del agente');
 const old=execFileSync('git',['show','5775193:workflow/pcram-classification-guard.mjs'],{cwd:fileURLToPath(root),encoding:'utf8'}).replaceAll('export function','function');
 assert.equal(validator.parameters.jsCode.split(old).length,2);
 validator.parameters.jsCode=validator.parameters.jsCode.replace(old,read('workflow/pcram-classification-guard.mjs').replaceAll('export function','function'));
 const anchor='guardClassification(ordered,raw.intermediateSteps,"4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c")';
 assert.equal(validator.parameters.jsCode.split(anchor).length,2);
 validator.parameters.jsCode=validator.parameters.jsCode.replace(anchor,anchor.replace('guardClassification','auditClassification').replace(/\)$/,',s.solicitud)'));
 const paths=['/nodes/4/parameters/options/systemMessage','/nodes/6/parameters/inputSchema','/nodes/7/parameters/jsCode'];
 const changes=paths.map(path=>{const get=w=>path.split('/').slice(1).reduce((o,k)=>o[k],w);return {path,nodeId:candidate.nodes[Number(path.split('/')[2])].id,before:get(baseline),after:get(candidate),beforeSha256:sha(get(baseline)),afterSha256:sha(get(candidate))};});
 const recovered=structuredClone(candidate);for(const c of changes)assign(recovered,c.path,c.before);assert.deepEqual(recovered,baseline);
 for(const name of ['Consulta_nomenclador_PCRAM','Cotizador deterministico','OpenAI Chat Model'])assert.deepEqual(candidate.nodes.find(n=>n.name===name),baseline.nodes.find(n=>n.name===name));
 assert.deepEqual(candidate.connections,baseline.connections);assert.deepEqual(candidate.settings,baseline.settings);
 return {baseline,candidate,changes};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const p=prepare();fs.mkdirSync(out,{recursive:true});
 const manifest={status:'LOCAL_PREPARED_E2E_NOT_VERIFIED_NOT_PUBLISHED',baselineCommit:'577519385712e09b3e0126dd3b8929c83ea150b7',baselinePublishedVersion:'6be26506-7879-4d13-a635-bb2fc3579a05',freshLiveRead:false,nodes:12,changedPaths:p.changes.map(c=>c.path),frozenIdentical:true,rollbackExact:true,modelCalls:0,cloudExecutions:0};
 fs.writeFileSync(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
 for(const [name,changes]of [['apply.patch.json',p.changes],['rollback.patch.json',p.changes.map(c=>({...c,before:c.after,after:c.before,beforeSha256:c.afterSha256,afterSha256:c.beforeSha256}))]])fs.writeFileSync(new URL(name,out),JSON.stringify({neverImportWholeWorkflow:true,requireFreshBaselineHashes:true,changes},null,2)+'\n');
 fs.writeFileSync(new URL('prompt.after.txt',out),p.candidate.nodes[4].parameters.options.systemMessage);
 console.log(JSON.stringify(manifest,null,2));
}
