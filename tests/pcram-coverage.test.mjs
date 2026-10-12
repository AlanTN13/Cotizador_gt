import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {performance} from 'node:perf_hooks';
import {z} from 'zod';
import {loadPackedNomenclator,queryPackedNomenclator} from '../workflow/pcram-nomenclator-packed.mjs';
import {pcramSearchInput} from '../workflow/pcram-tool-input.mjs';
import {guardClassification} from '../workflow/pcram-classification-guard.mjs';
import {prepare,root,out} from '../scripts/prepare-pcram-coverage.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const stem='data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c';
const packed=read(stem+'.indexed-v3.json'),index=read(stem+'.json'),p=prepare();
const q=(prefijo='',vista='detalle',texto='',indice=1)=>({indice,prefijo,texto,limite:8,vista});
const search=query=>queryPackedNomenclator(loadPackedNomenclator(packed),query);
const code=(w,name)=>w.nodes.find(n=>n.name===name).parameters.jsCode;
const vmQuery=(w,query)=>JSON.parse(runInNewContext(`(function(){${code(w,'Consulta_nomenclador_PCRAM')}})()`,{query},{timeout:5000}));
const wrap=(query,response)=>({action:{tool:'Consulta_nomenclador_PCRAM',toolInput:query},observation:JSON.stringify([{response:JSON.stringify(response)}])});
const guard=(product,input,r)=>guardClassification([product],[wrap(input,r)],packed.metadata.zip_sha256)[0];

test('six legacy recorded queries remain exactly equivalent to frozen tool',()=>{
 for(const f of ['shirt','watch-toy'])for(const recorded of read(`docs/evidence/pcram-er12-agent-contract-2026-10-10/production-gate/${f}.acceptance.json`).queries)assert.deepEqual(search(recorded.input),vmQuery(p.baseline,recorded.input));
});

test('complete branch views contain full source text and independent source counts, no first-branch sample',()=>{
 for(const prefix of ['6109','8517','9503']){
  const r=search(q(prefix,'ramas')),sims=index.sims.filter(x=>x[0].startsWith(prefix));
  const codes=[...new Set(sims.map(x=>x[0].slice(0,8)))];
  assert.deepEqual(r.results,[]);assert.deepEqual(r.branches.map(x=>x.ncm),codes);
  assert.equal(r.matched_count,sims.length);assert.equal(r.retrieval.total,codes.length);assert.equal(r.retrieval.complete,true);
  for(const b of r.branches){assert.equal(b.ncm_context,index.ncms[b.ncm][0]);assert.equal(b.ncm_field_full,index.ncms[b.ncm][1]);assert.equal(b.matched_sim_count,sims.filter(x=>x[0].startsWith(b.ncm)).length);}
 }
 const r=search(q('8517','ramas'));assert.ok(r.branches.find(b=>b.ncm==='85176272').ncm_context.includes('distintos de los aparatos de emisión, transmisión o recepción de las partidas 8443, 8525, 8527 u 8528'));
});

test('complete detail reaches all 18 toy SIM in one call, preserving descriptions and limits',()=>{
 const r=search(q('95030060')),rows=index.sims.filter(x=>x[0].startsWith('95030060'));
 assert.equal(r.retrieval.complete,true);assert.equal(r.partial,false);assert.equal(r.results.length,18);
 assert.deepEqual(r.results.map(x=>x.sim),rows.map(x=>x[0]));
 r.results.forEach((r,i)=>{assert.equal(r.sim_description,rows[i][1]);assert.equal(r.ncm_context,index.ncms[r.ncm][0]);assert.equal(r.description_limits.sim_field_full,rows[i][3]);});
 assert.equal(r.results[10].sim,'95030060912G');assert.equal(r.results[15].sim,'95030060992H');
});

test('record and byte overflow return no sample and explicit incomplete coverage',()=>{
 for(const [input,reason] of [[q('9503'),'RECORD_BUDGET_EXCEEDED'],[q('85','ramas'),'RECORD_BUDGET_EXCEEDED'],[q('8517'),'BYTE_BUDGET_EXCEEDED'],[q('','ramas','los'),'RECORD_BUDGET_EXCEEDED']]){
  const r=search(input);assert.equal(r.status,'OK');assert.equal(r.retrieval.complete,false);assert.equal(r.retrieval.reason,reason);assert.deepEqual(r.results,[]);assert.deepEqual(r.branches||[],[]);assert.equal(r.partial,true);assert.ok(Buffer.byteLength(JSON.stringify(r))<=65536);
 }
});

test('text-only views count AND matches completely when bounded; unsupported modes and all offsets fail closed',()=>{
 const r=search(q('','ramas','camiseta'));
 const rows=index.sims.filter(x=>(x[1]+' '+index.ncms[x[0].slice(0,8)][0]).toLowerCase().includes('camiseta'));
 assert.equal(r.retrieval.complete,true);assert.equal(r.matched_count,rows.length);assert.deepEqual(r.branches.map(b=>b.ncm),[...new Set(rows.map(x=>x[0].slice(0,8)))]);
 for(const change of [{offset:0},{offset:8},{offset:'8'},{vista:'sim'},{vista:null},{limite:64}])assert.equal(search({...q('95030060'),...change}).status,'INVALID_QUERY');
 assert.equal(pcramSearchInput({...q('95030060'),offset:8}),null);
 assert.deepEqual(pcramSearchInput({...q('95030060'),solicitud:{ignore:true}}),q('95030060'));
 assert.equal(search(q('9999')).status,'NO_MATCH');assert.equal(search(q('9999')).retrieval.complete,true);
});

test('new guard binds every business query field, product, complete detail and URI; stale responses cannot authorize',()=>{
 const input=q('95030060'),r=search(input),row=r.results[10],product={indice:1,clasificacion:row.ncm,SIM:row.sim};
 assert.deepEqual(guard(product,input,r),product);
 for(const changed of [{indice:2},{prefijo:'85176272'},{texto:'plastico'},{limite:4},{vista:'ramas'},{offset:8}])assert.equal(guard(product,{...input,...changed},r).SIM,null);
 for(const mutate of [x=>{x.retrieval.complete=false;},x=>{x.partial=true;},x=>{x.results[10].source_uri='pcram://wrong';},x=>{delete x.query.vista;},x=>{x.returned_count--;},x=>{x.retrieval.total--;},x=>{x.results[10].description_limits.ncm_field_full=true;}]){const bad=structuredClone(r);mutate(bad);assert.equal(guard(product,input,bad).SIM,null);}
 assert.equal(guard({...product,indice:2},input,r).SIM,null);
});

test('source truncation flags block precise SIM while preserving non-flagged NCM support',()=>{
 for(const [prefix,sim] of [['85176272','85176272900U'],['95030060','95030060992H']]){
  const input=q(prefix),r=search(input),row=r.results.find(x=>x.sim===sim);assert.equal(row.description_limits.sim_field_full,true);
  const checked=guard({indice:1,clasificacion:prefix,SIM:sim},input,r);assert.equal(checked.SIM,null);assert.equal(checked.clasificacion,prefix);
 }
});

test('overview and broad-family detail cannot authorize cotton or wheeled NCM; supplied partial remains supported',()=>{
 for(const [prefix,precise] of [['6109','61091000'],['9503','95030010']])for(const vista of ['ramas','detalle']){
  const input=q(prefix,vista),r=search(input),product={indice:1,clasificacion:precise,SIM:null};
  assert.equal(guard(product,input,r).clasificacion,null);
  const partial={...product,clasificacion:prefix};assert.deepEqual(guard(partial,input,r),partial);
 }
 // Boundary: directed branch can still be semantically wrong; this remains the agent's unproven decision.
 const input=q('95030010');const r=search(input);
 assert.equal(r.retrieval.complete,false); // branch itself exceeds fixed budget; cannot be selected through this oversized response.
});

test('embedded schema/tool/guard agree and exact five-field restoration preserves frozen circuit',()=>{
 for(const input of [q('8517','ramas'),q('95030060'),q('6109')])assert.deepEqual(vmQuery(p.candidate,input),search(input));
 const restored=structuredClone(p.candidate);for(const c of p.changes){const keys=c.path.split('/').slice(1),key=keys.pop();keys.reduce((v,k)=>v[k],restored)[key]=c.before;}
 assert.deepEqual(restored,p.baseline);assert.equal(p.changes.length,5);
 assert.doesNotMatch(p.instructions,/6109|8517|9503|\d+%/);assert.match(p.instructions,/Máximo dos consultas por producto/);
 assert.doesNotMatch(code(p.candidate,'Consulta_nomenclador_PCRAM'),/(?:^|\n)\s*(?:import\s|require\s*\()/);
 const schema=JSON.parse(p.candidate.nodes.find(n=>n.name==='Consulta_nomenclador_PCRAM').parameters.inputSchema);
 const validator=z.object(Object.fromEntries(Object.entries(schema.properties).map(([k,r])=>{let v=r.type==='integer'?z.number().int().min(r.minimum).max(r.maximum):r.enum?z.enum(r.enum):z.string().max(r.maxLength);return [k,schema.required.includes(k)?v:v.optional()];}))).catchall(z.any());
 for(const input of [q('8517','ramas'),q('95030060')])assert.deepEqual(vmQuery(p.candidate,validator.parse({...input,toolCallId:'local'})),search(input));
});

test('literal candidate validator rejects stale new-query responses and flagged SIM without changing supported NCM',()=>{
 const fixture=read('docs/evidence/pcram-er12-agent-contract-2026-10-10/executions.selected.json').cases.find(c=>c.id==='34453');
 const input=q('95030060'),r=vmQuery(p.candidate,input),row=r.results[10];
 const run=(product,query,response)=>JSON.parse(JSON.stringify(runInNewContext(`(function(){${code(p.candidate,'Validar salida del agente')}})()`,{
  $input:{first:()=>({json:{output:{productos:[product]},intermediateSteps:[wrap(query,response)]}})},$:()=>({first:()=>({json:{solicitud:fixture.input}})})
 },{timeout:5000})))[0].json.productos[0];
 const product={...fixture.agent_products[0],clasificacion:row.ncm,SIM:row.sim};
 assert.equal(run(product,input,r).SIM,row.sim);
 assert.equal(run(product,{...input,prefijo:'85176272'},r).SIM,null);
 const watch=q('85176272'),w=vmQuery(p.candidate,watch);
 const checked=run({...product,clasificacion:'85176272',SIM:'85176272900U'},watch,w);
 assert.equal(checked.SIM,null);assert.equal(checked.clasificacion,'85176272');
});

test('two-query route plus supplied partial fixture preserves actual candidate guard/calculator FAMILY_SNAPSHOT',()=>{
 const fixture=read('docs/evidence/pcram-er12-agent-contract-2026-10-10/executions.selected.json').cases.find(c=>c.id==='34453');
 const steps=['ramas','detalle'].map(vista=>{const input=q('6109',vista);return wrap(input,vmQuery(p.candidate,input));});
 const guarded=JSON.parse(JSON.stringify(runInNewContext(`(function(){${code(p.candidate,'Validar salida del agente')}})()`,{$input:{first:()=>({json:{output:{productos:fixture.agent_products},intermediateSteps:steps}})},$:()=>({first:()=>({json:{solicitud:fixture.input}})})},{timeout:5000})))[0].json;
 assert.deepEqual(guarded.productos,fixture.agent_products);
 const now=+new Date(fixture.started_at_ar);class FixedDate extends Date{constructor(x){super(x??now);}static now(){return now;}}
 const response=JSON.parse(JSON.stringify(runInNewContext(`(function(){${code(p.candidate,'Cotizador deterministico')}})()`,{$input:{first:()=>({json:guarded})},$:()=>({first:()=>({json:{intermediateSteps:steps}})}),Date:FixedDate},{timeout:5000})))[0].json.respuesta;
 assert.equal(response.total_usd,fixture.total_usd);assert.equal(response.auditoria.taxResolutions[0].estimation.components.find(x=>x.tax==='duty').method,'FAMILY_SNAPSHOT');
});

test('bounded-view single sample measurements include worst broad text and budget refusals',()=>{
 const measurements=[];
 for(const input of [q('6109','ramas'),q('8517','ramas'),q('9503','ramas'),q('95030060'),q('85176272'),q('6109'),q('85','ramas'),q('8517'),q('','ramas','los')]){
  const start=performance.now(),runtime=loadPackedNomenclator(packed),r=queryPackedNomenclator(runtime,input),ms=performance.now()-start,bytes=Buffer.byteLength(JSON.stringify(r));
  assert.ok(bytes<=65536);assert.ok(ms<5000);measurements.push({query:input,ms,bytes,retrieval:r.retrieval,stats:runtime.stats});
 }
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(new URL('measurements.json',out),JSON.stringify({mode:'LOCAL_SINGLE_SAMPLE_NOT_PRODUCTION_SLA',node:process.version,measurements},null,2)+'\n');
});
