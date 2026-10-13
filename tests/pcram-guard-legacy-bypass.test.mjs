// Offline guard contract checks. Product attributes below are fixtures, not agent output.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {createHash} from 'node:crypto';
import {guardClassification} from '../workflow/pcram-classification-guard.mjs';
import {loadPackedNomenclator,queryPackedNomenclator} from '../workflow/pcram-nomenclator-packed.mjs';
import {prepare,root} from '../scripts/prepare-pcram-coverage.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const packed=read('data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json');
const sourceSha=packed.metadata.zip_sha256,p=prepare();
const oldGuard=execFileSync('git',['show','c9b279c:workflow/pcram-classification-guard.mjs'],{encoding:'utf8'});
const beforeGuard=runInNewContext(`(()=>{${oldGuard.replace('export function','function')};return guardClassification;})()`);
const sha=x=>createHash('sha256').update(x).digest('hex');
const q=(prefijo,vista='detalle')=>({indice:1,prefijo,texto:'',limite:4,...(vista?{vista}:{})});
const search=input=>queryPackedNomenclator(loadPackedNomenclator(packed),input);
const step=(input,response,wrapped=true)=>({action:{tool:'Consulta_nomenclador_PCRAM',toolInput:input},observation:JSON.stringify(wrapped?[{response:JSON.stringify(response)}]:response)});
const check=(product,input,response,wrapped=true)=>guardClassification([product],[step(input,response,wrapped)],sourceSha)[0];
const toy=read('docs/evidence/pcram-er12-agent-contract-2026-10-10/production-gate/watch-toy.trace.json');
const toyStep=toy.agent_output[0].intermediateSteps.find(s=>s.action.toolInput.prefijo==='9503');
const toyResponse=JSON.parse(JSON.parse(toyStep.observation)[0].response);
const toyProduct=toy.agent_output[0].output.productos.find(x=>x.indice===2);
const positiveInput=q('95030060'),positiveResponse=search(positiveInput),positiveRow=positiveResponse.results.find(r=>r.sim==='95030060912G');
const positive={indice:1,producto:'Fixture: juego para construcción de plástico, producto completo, peso unitario >1,2 kg',clasificacion:positiveRow.ncm,SIM:positiveRow.sim,DIE:20,evidencia:[{url:positiveRow.source_uri,detalle:'Literal source material/product/weight conditions supplied in this local fixture only'}],fundamento:'Fixture attributes supplied explicitly; no real product classification claimed'};

test('reproduce c9b279c legacy bypass on real #34455; corrected guard rejects toy precise NCM',()=>{
 assert.equal(beforeGuard([toyProduct],[toyStep],sourceSha)[0],toyProduct);
 const result=guardClassification([toyProduct],[toyStep],sourceSha)[0];
 assert.equal(result.clasificacion,null);assert.equal(result.SIM,null);assert.equal(result.DIE,toyProduct.DIE);
 assert.ok(result.evidencia.every(e=>!e.url.startsWith('pcram://')));
 assert.match(result.fundamento,/Estimación: identificador no acreditado/);
});

test('legacy generic first four cannot accredit toy SIM either, in direct or Agent V3 envelope',()=>{
 const row=toyResponse.results[0],product={...toyProduct,clasificacion:row.ncm,SIM:row.sim};
 assert.equal(beforeGuard([product],[step(toyStep.action.toolInput,toyResponse)],sourceSha)[0],product);
 for(const wrapped of [false,true]){
  const result=check(product,toyStep.action.toolInput,toyResponse,wrapped);
  assert.equal(result.clasificacion,null);assert.equal(result.SIM,null);assert.equal(result.DIE,product.DIE);
 }
});

test('legacy cotton opening with missing composition is rejected; no synthetic alternative manufactured',()=>{
 const fixture=read('docs/evidence/pcram-er12-agent-contract-2026-10-10/executions.selected.json').cases.find(c=>c.id==='34451');
 const input=q('6109',null),response=search(input),product=fixture.agent_products[0];
 assert.equal(beforeGuard([product],[step(input,response)],sourceSha)[0],product);
 const result=check(product,input,response);assert.equal(result.clasificacion,null);assert.equal(result.SIM,null);
 assert.equal(result.DIE,product.DIE);assert.ok(result.fundamento.startsWith(product.fundamento));
});

test('even legacy exact-SIM complete lookup cannot support a precise code without vista',()=>{
 const input=q(positive.SIM,null),response=search(input);assert.equal(response.results.length,1);assert.equal(response.partial,false);
 assert.equal(beforeGuard([positive],[step(input,response)],sourceSha)[0],positive);
 const result=check(positive,input,response);assert.equal(result.clasificacion,null);assert.equal(result.SIM,null);
});

test('legacy/new response mixing cannot bypass explicit query/detail contract',()=>{
 const mutations=[
  [q('95030060',null),positiveResponse],
  [positiveInput,{...positiveResponse,query:q('95030060',null)}],
  [q('95030060',null),{...positiveResponse,query:q('95030060',null)}],
  [positiveInput,{...positiveResponse,retrieval:undefined}],
 ];
 for(const [input,response] of mutations){const result=check(positive,input,response);assert.equal(result.clasificacion,null);assert.equal(result.SIM,null);}
});

test('legitimate directed complete detail preserves supported precise NCM/SIM and existing source checks',()=>{
 assert.match(positiveRow.sim_description,/De plástico/);assert.match(positiveRow.sim_description,/superior a 1,2 kg/);
 assert.ok(!positiveRow.sim_description.includes('Partes y accesorios'));
 for(const wrapped of [false,true])assert.deepEqual(check(positive,positiveInput,positiveResponse,wrapped),positive);
 const wrongs=[
  {input:{...positiveInput,indice:2},response:positiveResponse},
  {input:{...positiveInput,prefijo:'85176272'},response:positiveResponse},
  {input:positiveInput,response:{...positiveResponse,source:{...positiveResponse.source,zip_sha256:'wrong'}}},
  {input:positiveInput,response:{...positiveResponse,retrieval:{...positiveResponse.retrieval,complete:false}}},
 ];
 for(const {input,response} of wrongs)assert.equal(check(positive,input,response).SIM,null);
});

test('source truncation still prevents precise SIM; safe NCM remains supported',()=>{
 const input=q('85176272'),response=search(input),product={...positive,clasificacion:'85176272',SIM:'85176272900U'};
 const row=response.results.find(r=>r.sim===product.SIM);assert.equal(row.description_limits.sim_field_full,true);
 const result=check(product,input,response);assert.equal(result.SIM,null);assert.equal(result.clasificacion,'85176272');
});

test('HS4/HS6 estimates remain unchanged with legacy observations or no precise supporting response',()=>{
 for(const partial of ['6109','851762']){
  const product={...positive,clasificacion:partial,SIM:null};
  assert.deepEqual(check(product,q(partial,null),search(q(partial,null))),product);
  assert.deepEqual(guardClassification([product],[],sourceSha)[0],product);
 }
});

test('malformed/ambiguous/error observations cannot restore precise support',()=>{
 const bad=['{',JSON.stringify([{error:'tool failed'}]),JSON.stringify([{response:JSON.stringify(positiveResponse)},{response:JSON.stringify(positiveResponse)}]),JSON.stringify({error:'tool failed',...positiveResponse})];
 for(const observation of bad){const result=guardClassification([positive],[{action:{tool:'Consulta_nomenclador_PCRAM',toolInput:positiveInput},observation}],sourceSha)[0];assert.equal(result.clasificacion,null);assert.equal(result.SIM,null);}
});

test('literal n8n validator rejects the real legacy position and preserves directed detail support',()=>{
 const fixture=read('docs/evidence/pcram-er12-agent-contract-2026-10-10/executions.selected.json').cases.find(c=>c.id==='34453');
 const js=p.candidate.nodes.find(n=>n.name==='Validar salida del agente').parameters.jsCode;
 const run=(product,s)=>JSON.parse(JSON.stringify(runInNewContext(`(function(){${js}})()`,{
  $input:{first:()=>({json:{output:{productos:[product]},intermediateSteps:[s]}})},$:()=>({first:()=>({json:{solicitud:fixture.input}})})
 },{timeout:5000})))[0].json.productos[0];
 const input={...toyStep.action.toolInput,indice:1},response={...toyResponse,query:{...toyResponse.query,indice:1}};
 assert.equal(run({...toyProduct,indice:1},step(input,response)).clasificacion,null);
 assert.equal(run(positive,step(positiveInput,positiveResponse)).SIM,positive.SIM);
});

test('candidate delta and rollback relative to c9b279c are exactly one validator jsCode field',()=>{
 const before=structuredClone(p.baseline),oldPatch=JSON.parse(execFileSync('git',['show','c9b279c:docs/evidence/pcram-coverage-local/apply.patch.json'],{encoding:'utf8',maxBuffer:16*1024*1024}));
 const assign=(w,path,value)=>{const parts=path.split('/').slice(1),key=parts.pop();parts.reduce((o,k)=>o[k],w)[key]=value;};
 for(const c of oldPatch.changes)assign(before,c.path,c.after);
 const validatorBefore=before.nodes[7].parameters.jsCode,validatorAfter=p.candidate.nodes[7].parameters.jsCode;
 assert.notEqual(sha(validatorBefore),sha(validatorAfter));
 const recovered=structuredClone(p.candidate);assign(recovered,'/nodes/7/parameters/jsCode',validatorBefore);
 assert.deepEqual(recovered,before);assert.equal(recovered.nodes.length,12);
 assert.equal(p.candidate.nodes[4].parameters.options.systemMessage,before.nodes[4].parameters.options.systemMessage);
 assert.equal(p.candidate.nodes[9].parameters.jsCode,before.nodes[9].parameters.jsCode);
 const completeRecovery=structuredClone(p.candidate);for(const c of p.changes)assign(completeRecovery,c.path,c.before);
 assert.deepEqual(completeRecovery,p.baseline);
});
