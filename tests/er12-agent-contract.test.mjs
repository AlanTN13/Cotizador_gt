// Recorded Cloud data + literal frozen nodes, offline only. No agent behavior claim.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {prepare, root, out, sha} from '../scripts/prepare-er12-agent-contract.mjs';
const p = prepare();
const recorded = JSON.parse(fs.readFileSync(new URL('executions.selected.json',out),'utf8'));
const node = name => p.baseline.nodes.find(n => n.name===name);
const toolCode = node('Consulta_nomenclador_PCRAM').parameters.jsCode;
const guardCode = node('Validar salida del agente').parameters.jsCode;
const calcCode = node('Cotizador deterministico').parameters.jsCode;
const clone = x => JSON.parse(JSON.stringify(x));
const query = q => JSON.parse(runInNewContext(`(function(){${toolCode}})()`,{query:q},{timeout:5000}));
const wrap = (q,r) => ({action:{tool:'Consulta_nomenclador_PCRAM',toolInput:q},
  observation:JSON.stringify([{response:JSON.stringify(r)}])});
const runGuard = (products,steps,input) => clone(runInNewContext(`(function(){${guardCode}})()`,{
  $input:{first:()=>({json:{output:{productos:products},intermediateSteps:steps}})},
  $:()=>({first:()=>({json:{solicitud:input}})}),
},{timeout:5000})[0].json);
const fixtures = recorded.cases.map(c => ({...c,steps:c.queries.map(q=>wrap(q.input,query(q.input)))}));
const metrics = {mode:'OFFLINE_REPLAY_AND_CONTRACT_CHECKS_NOT_LIVE_AGENT',queries:[],cases:[]};

test('only systemMessage changes; 12 nodes, entire frozen circuit/model/taxes and scoped rollback exact',()=>{
  assert.equal(p.baseline.nodes.length,12);
  const reset = structuredClone(p.candidate);
  const target = reset.nodes.find(n=>n.id===p.patch.nodeId);
  assert.equal(sha(target.parameters.options.systemMessage),p.rollback.beforeSha256);
  target.parameters.options.systemMessage=p.rollback.value;
  assert.deepEqual(reset,p.baseline);
  assert.equal(p.patch.field,'parameters.options.systemMessage');
  assert.equal(p.patch.beforeSha256,sha(p.before));
  assert.equal(p.patch.afterSha256,sha(p.after));
  // No rates, SIMs, brand mappings or per-product special cases introduced in the patch.
  for(const [,added] of p.changes)assert.doesNotMatch(added,/8517|9503|6109|VALDUS|Chengji|\d+[,.]?\d*%/);
});

test('all seven recorded queries reproduce actual status/source/count/partial and candidates',()=>{
  for(const c of fixtures)for(let i=0;i<c.queries.length;i++){
    const original=c.queries[i], response=JSON.parse(JSON.parse(c.steps[i].observation)[0].response);
    assert.equal(response.status,original.status);
    assert.equal(response.source.zip_sha256,recorded.classification_source_sha256);
    assert.equal(response.source.ncm_sha256,recorded.classification_ncm_sha256);
    for(const k of ['matched_count','returned_count','partial'])
      if(k in original && k in response)assert.equal(response[k],original[k]);
    if(original.returned_sims)assert.deepEqual(response.results.map(r=>r.sim),original.returned_sims);
    if(response.status==='INVALID_QUERY')assert.equal(response.results.length,0);
  }
});

test('34452 input failure is the >8-term boundary, not n8n context or missing PCRAM records',()=>{
  const c=fixtures.find(c=>c.id==='34452');
  const tokens=s=>[...new Set(s.toLowerCase().match(/[a-z0-9]+/g))];
  assert.equal(tokens(c.queries[1].input.texto).length,11);
  assert.equal(tokens(c.queries[2].input.texto).length,9);
  for(const q of c.queries.slice(1)){
    assert.ok(q.input.texto.length<=160);
    assert.equal(query(q.input).status,'INVALID_QUERY');
    // Boundary control, not a proposed classification or a synonym truncation policy.
    assert.notEqual(query({...q.input,texto:tokens(q.input.texto).slice(0,8).join(' ')}).status,'INVALID_QUERY');
  }
});

test('original Agent V3 envelope → unchanged guard → unchanged calculator reproduces the three real audits',()=>{
  for(const c of fixtures){
    const v=runGuard(c.agent_products,c.steps,c.input);
    assert.deepEqual(v.productos,c.agent_products); // No identifier was lost in these executions.
    const now=+new Date(c.started_at_ar);
    class FixedDate extends Date{constructor(x){super(x??now);}static now(){return now;}}
    const r=clone(runInNewContext(`(function(){${calcCode}})()`,{
      $input:{first:()=>({json:v})},
      $:()=>({first:()=>({json:{intermediateSteps:c.steps}})}),Date:FixedDate,
    },{timeout:5000})[0].json.respuesta);
    assert.equal(r.total_usd,c.total_usd);assert.equal(r.peso_considerado_kg,c.applicable_weight);
    const audit=r.auditoria.taxResolutions;
    c.tax_selected.forEach((expected,i)=>{
      const actual=audit[i];
      for(const k of ['status','requestedPosition','ncm','sim','rates','warnings'])assert.deepEqual(actual[k],expected[k]);
      if(expected.dutyEvidence===null)assert.equal(actual.dutyEvidence,null);
      else{
        assert.equal(actual.dutyEvidence.version,expected.dutyEvidence.version);
        assert.equal(actual.dutyEvidence.matchedSimCount,expected.dutyEvidence.matchedSimCount);
      }
      const methods=Object.fromEntries(actual.estimation.components.map(e=>[e.tax,e.method]));
      assert.deepEqual(methods,expected.estimation_methods);
    });
    metrics.cases.push({id:c.id,total:r.total_usd,products:v.productos.map(x=>({indice:x.indice,clasificacion:x.clasificacion,SIM:x.SIM})),
      taxes:audit.map(t=>({rates:t.rates,requestedPosition:t.requestedPosition,
        method:t.estimation.components.find(e=>e.tax==='duty')?.method??'POSITION_SNAPSHOT',warnings:t.warnings}))});
  }
});

test('bounded query shapes specified by the candidate execute the real frozen tool, without fabricating positions',()=>{
  // Explicit local tool fixtures derived from the recorded prefixes; NOT agent outputs.
  for(const q of [{indice:1,prefijo:'8517',texto:'',limite:4},
    {indice:2,prefijo:'9503',texto:'juguete',limite:4},
    {indice:1,prefijo:'6109',texto:'',limite:4}]){
    const r=query(q);assert.equal(r.status,'OK');assert.equal(r.query.indice,q.indice);
    assert.ok(r.returned_count<=q.limite);assert.equal(r.source.zip_sha256,recorded.classification_source_sha256);
    assert.ok(r.results.every(x=>x.sim.startsWith(q.prefijo)));
    metrics.queries.push({input:q,status:r.status,matched_count:r.matched_count,returned_count:r.returned_count,
      partial:r.partial,candidates:r.results.map(x=>({ncm:x.ncm,sim:x.sim,context:x.ncm_context}))});
  }
});

test('partial recording remains partial; invented codes, wrong source/product and malformed observations rejected',()=>{
  const c=fixtures.find(c=>c.id==='34453');
  assert.equal(runGuard(c.agent_products,c.steps,c.input).productos[0].clasificacion,'6109');
  assert.equal(runGuard(c.agent_products,c.steps,c.input).productos[0].SIM,null);
  const r=query({indice:1,prefijo:'6109',texto:'',limite:4});
  const exact={...c.agent_products[0],clasificacion:r.results[0].ncm,SIM:r.results[0].sim};
  assert.equal(runGuard([exact],[wrap(r.query,r)],c.input).productos[0].SIM,exact.SIM);
  const wrong=clone(r);wrong.source.zip_sha256='0'.repeat(64);
  const traces=[[wrap(r.query,wrong)],[wrap({...r.query,indice:2},r)],
    [{action:{tool:'Consulta_nomenclador_PCRAM',toolInput:r.query},observation:'[{"error":"failed"}]'}],
    [{action:{tool:'Consulta_nomenclador_PCRAM',toolInput:r.query},observation:'not JSON'}]];
  for(const steps of traces){const v=runGuard([exact],steps,c.input).productos[0];
    assert.equal(v.SIM,null);assert.equal(v.clasificacion,null);assert.equal(v.DIE,exact.DIE);}
  const invented={...exact,clasificacion:'99999999',SIM:'99999999999Z'};
  assert.equal(runGuard([invented],[wrap(r.query,r)],c.input).productos[0].SIM,null);
});

test('existing integrity gate: nomenclator bytes and tax/calculator/model fields remain untouched',()=>{
  const idx='data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json';
  assert.equal(sha(fs.readFileSync(new URL(idx,root))),'0af99430268dcdeaa1c7db6af7caf33ffba4481bf523a6f386ed96a6aeee903f');
  assert.equal(sha(calcCode),'2530f19f9fe18b928cbeb0cf4d2cbadc8c005e0a139f29d19c5fbf72bdc5be99');
  for(const name of ['Cotizador deterministico','OpenAI Chat Model','Consulta_nomenclador_PCRAM','Validar salida del agente'])
    assert.deepEqual(p.candidate.nodes.find(n=>n.name===name),node(name));
  assert.deepEqual(p.candidate.connections,p.baseline.connections);
  assert.deepEqual(p.candidate.settings,p.baseline.settings);
  fs.writeFileSync(new URL('local-replay.results.json',out),JSON.stringify(metrics,null,2)+'\n');
});
