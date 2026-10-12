// Deterministic bounded tool routes with explicit navigation decisions, not an agent/classifier.
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {prepare,out} from '../scripts/prepare-pcram-coverage.mjs';
const p=prepare(),q=(prefijo,vista='detalle',indice=1,texto='')=>({indice,prefijo,texto,limite:8,vista});
const tool=p.candidate.nodes.find(n=>n.name==='Consulta_nomenclador_PCRAM').parameters.jsCode;
const report={status:'LOCAL_TWO_QUERY_RETRIEVAL_VERIFIED_NOT_AGENT_CLASSIFICATION',node:process.version,scope:'Explicit navigation fixtures; no new product attributes claimed; source limits retained',routes:[]};
function route(){const calls=[];return {calls,call(input){assert.ok(calls.filter(c=>c.input.indice===input.indice).length<2,'TWO_QUERY_BUDGET_EXHAUSTED');const response=JSON.parse(runInNewContext(`(function(){${tool}})()`,{query:input},{timeout:5000}));calls.push({input,response});return response;}};}

test('toy: overview then complete detail exposes positions 11/16 within two calls without offset or code injection',()=>{
 const run=route(),overview=run.call(q('9503','ramas',2));
 const branch=overview.branches.find(b=>b.ncm_context.startsWith('Los demás juegos o surtidos y juguetes para construcción.'));
 assert.ok(branch);const detail=run.call(q(branch.ncm,'detalle',2));
 assert.equal(detail.retrieval.complete,true);assert.equal(detail.results.length,18);
 assert.ok(['95030060912G','95030060992H'].every(sim=>detail.results.some(r=>r.sim===sim)));
 assert.ok(detail.results.slice(0,4).every(r=>r.sim_description.includes('Partes y accesorios')));
 assert.ok(!detail.results[10].sim_description.includes('Partes y accesorios'));
 assert.throws(()=>run.call(q(branch.ncm,'detalle',2)),/TWO_QUERY_BUDGET_EXHAUSTED/);
 report.routes.push({id:'toy',initialDecision:'Existing supported family9503; no commercial lexical query',refinementDecision:'Inspect returned construction-toy branch by literal source description. This is a navigation hypothesis, not proof the real product belongs there.',calls:run.calls,finalClassification:'NOT_GENERATED',availableSIMs:18,sourceFlaggedControls:['95030060992H']});
});

test('watch: branch38 is visible with entire exclusion, two-call detail shows both SIM without certifying truncated source',()=>{
 const run=route(),overview=run.call(q('8517','ramas'));
 const branch=overview.branches.find(b=>b.ncm_context.startsWith('De frecuencia inferior a 15 GHz y tasa de transmisión inferior o igual a 34 Mbit/s, excepto los intercomunicadores.'));
 assert.ok(branch);assert.ok(overview.branches.indexOf(branch)>8);
 assert.ok(branch.ncm_context.includes('distintos de los aparatos de emisión, transmisión o recepción de las partidas 8443, 8525, 8527 u 8528'));
 const detail=run.call(q(branch.ncm));assert.equal(detail.results.length,2);assert.ok(detail.results.some(r=>r.sim==='85176272900U'));
 assert.ok(detail.results.every(r=>r.description_limits.sim_field_full));
 report.routes.push({id:'watch',initialDecision:'Existing family8517 is supplied as a hypothesis; no new factual technology claim',refinementDecision:'Inspect a returned branch with explicit frequency/data-rate/exclusion conditions; actual product attributes remain unverified.',calls:run.calls,finalClassification:'NOT_GENERATED; exact SIM remains unsupported because source fields are flagged and real attributes are missing'});
});

test('shirt: no composition decision required to expose both materials and every SIM in two calls',()=>{
 const run=route(),overview=run.call(q('6109','ramas'));assert.equal(overview.branches.length,2);
 const details=run.call(q('6109'));assert.equal(details.results.length,10);assert.equal(details.retrieval.complete,true);
 assert.ok(details.results.some(r=>r.sim==='61099000119F'));
 report.routes.push({id:'shirt',initialDecision:'HS6109 already supplied by recorded fixture; composition unknown',refinementDecision:'No branch selected: inspect full supported family to retain family evidence and partiality',calls:run.calls,finalClassification:'NOT_GENERATED; separate regression test supplies historical HS6109/SIMnull and verifies FAMILY_SNAPSHOT'});
});

test('NO_MATCH contingency preserves two-call cap and admits insufficient coverage rather than guessing offsets',()=>{
 const run=route();assert.equal(run.call(q('','ramas',2,'juguete bloques')).status,'NO_MATCH');
 const second=run.call(q('9503','detalle',2));assert.equal(second.retrieval.complete,false);assert.deepEqual(second.results,[]);
 assert.throws(()=>run.call(q('9503','detalle',2)),/TWO_QUERY_BUDGET_EXHAUSTED/);
 report.routes.push({id:'no_match_contingency',initialDecision:'Deliberate replay of prior bad commercial conjunction, not preferred new route',calls:run.calls,finalClassification:'NOT_GENERATED; must remain independently justified partial or null; coverage unavailable within remaining call'});
});

test('first response above budget contains no misleading leading branch subset',()=>{
 const run=route(),first=run.call(q('85','ramas'));assert.equal(first.retrieval.complete,false);assert.deepEqual(first.branches,[]);
 report.routes.push({id:'oversized_family',initialDecision:'Deliberately broad supported chapter',calls:run.calls,finalClassification:'NOT_GENERATED; refine only with independent evidence, otherwise partial. No useful-coverage claim.'});
});

after(()=>{fs.mkdirSync(out,{recursive:true});report.candidateFieldHashes=p.changes.map(c=>({path:c.path,before:c.beforeSha256,after:c.afterSha256}));fs.writeFileSync(new URL('two-query-routes.json',out),JSON.stringify(report,null,2)+'\n');});
