// Entirely offline; actual frozen Code Tool + calculator, no model or Cloud.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {prepare,sha} from '../scripts/prepare-family-die-estimate.mjs';
import {sha256Ascii,estimateFamilyDuty} from '../workflow/tax-family-estimate.mjs';
const p=prepare(),node=name=>p.baseline.nodes.find(n=>n.name===name);
const now=new Date('2026-10-10T13:02:16Z');
class FixedDate extends Date {constructor(value){super(value??+now);}static now(){return +now;}}
const load=name=>JSON.parse(fs.readFileSync(new URL('../docs/evidence/pcram-cloud-qa-34448/'+name,import.meta.url),'utf8'));
const recorded=load('validator-output.transcribed.json');delete recorded.extraction;
const tool=query=>JSON.parse(runInNewContext(`(function(){${node('Consulta_nomenclador_PCRAM').parameters.jsCode}})()`,{query},{timeout:5000}));
const responses=load('tool-observations.selected-fields.json').observations.map(r=>tool(r.query));
const step=r=>({action:{tool:'Consulta_nomenclador_PCRAM',toolInput:r.query},observation:JSON.stringify([{response:JSON.stringify(r)}])});
const steps=responses.map(step);
const run=(code,input=recorded,trace=steps)=>JSON.parse(JSON.stringify(runInNewContext(`(function(){${code}})()`,{
  $input:{first:()=>({json:structuredClone(input)})},
  $:name=>{assert.equal(name,'Agente Despachante');return {first:()=>({json:{intermediateSteps:trace}})};},Date:FixedDate,
},{timeout:5000})[0].json.respuesta));
const resolution=r=>r.auditoria.taxResolutions[0];
const tax=p.data['../../data/tax-die-te.json'];
const product=recorded.productos[0];
const estimate=(overrides={})=>estimateFamilyDuty(overrides.hs??'6109',overrides.product??product,overrides.now??now,
  overrides.tax??structuredClone(tax),overrides.proof??structuredClone(p.proof),overrides.steps??structuredClone(steps));
const withProduct=(classification,SIM,DIE=16)=>({...structuredClone(recorded),productos:[{...product,clasificacion:classification,SIM,DIE}]});

test('SHA-256 integrity matches native implementation, including multi-block inputs',()=>{
  for(const text of ['', 'abc', 'x'.repeat(5000),JSON.stringify(Object.keys(tax.rows).sort())])assert.equal(sha256Ascii(text),sha(text));
  assert.throws(()=>sha256Ascii('á'));
});
test('one calculator field; 12 nodes, all other fields intact; guarded rollback exact',()=>{
  const candidate=structuredClone(p.baseline),target=candidate.nodes.find(n=>n.id===p.apply.nodeId);
  assert.equal(sha(target.parameters.jsCode),p.apply.beforeSha256);target.parameters.jsCode=p.apply.value;
  assert.equal(candidate.nodes.length,12);assert.equal(sha(target.parameters.jsCode),p.rollback.beforeSha256);
  target.parameters.jsCode=p.rollback.value;assert.deepEqual(candidate,p.baseline);
  const calc=s=>s.slice(s.indexOf('function calculate('));
  assert.equal(calc(p.after).replace(/resolveProductTaxes\(p,i,now,taxResolver,estimationPolicy,\{proof:familyCoverageProof,steps:\(\(\)=>\{try\{return \$\('Agente Despachante'\)\.first\(\)\.json\.intermediateSteps;\}catch\{return \[\];\}\}\)\(\)\}\)/,'resolveProductTaxes(p,i,now,taxResolver,estimationPolicy)'),calc(p.before));
  const prefix=s=>s.slice(0,s.indexOf('function resolveProductTaxes('));
  assert.ok(prefix(p.after).startsWith(prefix(p.before))); // entire embedded tax runtime + three data objects unchanged
});
test('local replay of both recorded queries reproduces all selected actual fields',()=>{
  const originals=load('tool-observations.selected-fields.json').observations;
  originals.forEach((old,i)=>{
    const r=responses[i];for(const key of ['status','query','matched_count','returned_count','partial','results'])assert.deepEqual(r[key],old[key]);
    assert.equal(r.source.zip_sha256,old.source_sha256);
  });
  assert.equal(responses[1].partial,true);assert.equal(responses[1].returned_count,4);
  assert.equal(p.proof.families['6109'][0],10);assert.equal(estimate().rate,0.2);
});
test('34448 offline regression: 906 -> 931.88, 20% family provenance, no fabricated SIM',()=>{
  const before=run(p.before),after=run(p.after),t=resolution(after);
  assert.equal(before.total_usd,906);assert.equal(after.total_usd,931.88);
  assert.equal(t.rates.duty,0.2);assert.equal(t.status,'ESTIMADO');
  assert.equal(t.ncm,null);assert.equal(t.sim,null);assert.equal(t.requestedPosition,null);assert.equal(t.dutyEvidence,null);
  assert.equal(t.estimation.components.find(c=>c.tax==='duty').method,'FAMILY_SNAPSHOT');
  assert.match(t.estimation.components[0].basis,/cobertura íntegra 10\/10/);
  assert.ok(t.warnings.includes('FAMILY_SNAPSHOT_DUTY_ESTIMATE'));assert.ok(!t.warnings.includes('AGENT_DUTY_ESTIMATE'));
  assert.deepEqual(t.agentEvidence,resolution(before).agentEvidence); // agent's original 16% kept as evidence
  assert.deepEqual(after.auditoria.productos,before.auditoria.productos);
  assert.equal(t.rates.statistical,resolution(before).rates.statistical);assert.equal(t.rates.vat,resolution(before).rates.vat);
  assert.deepEqual(t.estimation.components.filter(c=>c.tax!=='duty'),resolution(before).estimation.components.filter(c=>c.tax!=='duty'));
  for(const key of ['flete_internacional_usd','handling_con_iva_usd','peso_considerado_kg'])assert.equal(after[key],before[key]);
  for(const key of ['peso_real_total_kg','peso_volumetrico_total_kg','tarifa_usd_kg','cif_usd','tasa_estadistica_usd','asignacion_cif'])assert.equal(after.auditoria[key],before.auditoria[key]);
  assert.equal(after.auditoria.cif_usd,528.43);assert.equal(after.flete_internacional_usd,580);assert.equal(after.handling_con_iva_usd,90.75);
});
test('existing literal validator unchanged and feeds partial classification into candidate',()=>{
  const validated=JSON.parse(JSON.stringify(runInNewContext(`(function(){${node('Validar salida del agente').parameters.jsCode}})()`,{
    $input:{first:()=>({json:{output:{productos:recorded.productos},intermediateSteps:steps}})},
    $:()=>({first:()=>({json:{solicitud:recorded.solicitud}})}),
  },{timeout:5000})))[0].json;
  assert.deepEqual(validated.productos,recorded.productos);assert.equal(run(p.after,validated).total_usd,931.88);
});
test('confirmed smartwatch SIM precedence and specific 0 / 0 / 10.5 unchanged',()=>{
  const input=withProduct('85176272','85176272900U');
  const a=run(p.before,input),b=run(p.after,input);assert.deepEqual(b,a);
  assert.deepEqual(resolution(b).rates,{duty:0,statistical:0,vat:0.105});
  assert.equal(resolution(b).dutyEvidence.matchedSimCount,1);
});
test('confirmed toy NCM retains PCRAM 20 / 3 and entire original audit',()=>{
  const input=withProduct('95030060',null);const a=run(p.before,input),b=run(p.after,input);
  assert.deepEqual(b,a);assert.equal(resolution(b).rates.duty,0.2);assert.equal(resolution(b).rates.statistical,0.03);
});
test('real mixed family 1001 never selects first or highest rate',()=>{
  const r=tool({indice:1,prefijo:'1001',texto:'',limite:4}),input=withProduct('1001',null);
  const trace=[step(r)];assert.equal(r.status,'OK');
  const rates=new Set(Object.entries(tax.rows).filter(([sim])=>sim.startsWith('1001')).map(([,row])=>row.duty));
  assert.ok(rates.size>1);assert.deepEqual(run(p.after,input,trace),run(p.before,input,trace));
  assert.equal(estimate({hs:'1001',product:input.productos[0],steps:trace}),null);
});
test('source coverage mismatch real family 9503 retains original fallback',()=>{
  assert.equal(p.proof.families['9503'],undefined);
  const r=tool({indice:1,prefijo:'9503',texto:'',limite:4}),input=withProduct('9503',null);
  assert.deepEqual(run(p.after,input,[step(r)]),run(p.before,input,[step(r)]));
});
test('no family or unsupported family never changes original estimate',()=>{
  for(const hs of [null,'9999','61','61099','6109x']){
    const input=withProduct(hs,null);assert.deepEqual(run(p.after,input),run(p.before,input));
  }
  assert.deepEqual(run(p.after,recorded,[]),run(p.before,recorded,[]));
});
test('HS6 supported with full family coverage, no prefix or 20% hardcode',()=>{
  const r=tool({indice:1,prefijo:'610910',texto:'',limite:4}),input=withProduct('610910',null);
  assert.equal(p.proof.families['610910'][0],4);assert.equal(resolution(run(p.after,input,[step(r)])).rates.duty,0.2);
  assert.doesNotMatch(estimateFamilyDuty.toString(),/6109|\.2\b/);
});
test('another real uniform family uses its actual 9%, not a forced 20%',()=>{
  const r=tool({indice:1,prefijo:'1102',texto:'',limite:4}),input=withProduct('1102',null);
  assert.equal(p.proof.families['1102'][0],8);
  assert.equal(resolution(run(p.after,input,[step(r)])).rates.duty,0.09);
});
test('missing, corrupt, stale, future or incompatible sources fail to original estimate',()=>{
  const variations=[
    t=>{delete t.rows['61091000110Y'];},t=>{t.rowCount--;},t=>{t.source.sha256='0'.repeat(64);},
    t=>{t.version='wrong';},t=>{t.source.capturedAt='2027-01-01';},t=>{t.source.reviewAfter='2026-09-01';},
    t=>{t.rows['61091000110Y'].duty=null;},t=>{t.rows['61091000110Y'].duty=NaN;},
    t=>{t.rows['61091000110Y'].duty=true;},t=>{t.rows['61091000110Y'].duty=1.01;},
    t=>{t.rows['61091000110Y'].duty=0.16;},t=>{t.rows['61091000110Y'].updatedAt='2026-10-09';},
    t=>{t.rows['61091000999Z']=t.rows['61091000110Y'];delete t.rows['61091000110Y'];},
    t=>{t.rows=null;},
  ];
  for(const change of variations){const t=structuredClone(tax);change(t);assert.equal(estimate({tax:t}),null);}
  assert.equal(estimate({now:new Date('2026-11-01')}),null);
  for(const change of [v=>{delete v.families['6109'];},v=>{v.classification.tax_snapshot_sha256='0'.repeat(64);},
      v=>{v.classificationUpdatedAt='2027-01-01';},v=>{v.families['6109'][1]='0'.repeat(64);},
      v=>{v.families['6109'][0]=4;}]){const proof=structuredClone(p.proof);change(proof);assert.equal(estimate({proof}),null);}
});
test('malformed, mismatched-index, NO_MATCH, error or fabricated trace cannot substantiate family',()=>{
  const variations=[
    s=>{s[1].action.tool='Web Search';},s=>{s[1].action.toolInput={...s[1].action.toolInput,indice:2};},
    s=>{s[1].observation='not JSON';},s=>{s[1].observation='[{"error":"failure"}]';},
    s=>{s[1].observation=JSON.stringify([{response:JSON.stringify(responses[1])},{response:'{}'}]);},
    s=>{const r=structuredClone(responses[1]);r.source.zip_sha256='0'.repeat(64);s[1]=step(r);},
    s=>{const r=structuredClone(responses[1]);r.results=r.results.map(v=>({...v,source_uri:'fabricated'}));s[1]=step(r);},
    s=>{const r=structuredClone(responses[1]);r.results=r.results.map(v=>({...v,sim:'99999999999Z'}));s[1]=step(r);},
    s=>{const r=structuredClone(responses[1]);r.results=r.results.map(v=>({...v,sim:'61091000999Z',source_uri:`pcram://${r.source.zip_sha256}/sim/61091000999Z`}));s[1]=step(r);},
  ];
  for(const change of variations){const trace=structuredClone(steps);change(trace);assert.equal(estimate({steps:trace}),null);assert.deepEqual(run(p.after,recorded,trace),run(p.before,recorded,trace));}
  assert.equal(estimate({steps:[steps[0]]}),null);
  assert.equal(estimate({product:{...product,SIM:'malformed'}}),null);
  assert.equal(estimate({steps:[{...steps[1],observation:JSON.stringify(responses[1])}]}).rate,0.2); // valid direct observation
});
test('failing integrity never alters TE/IVA and keeps original AGENT_ESTIMATE branch',()=>{
  const changed=structuredClone(p.data);delete changed['../../data/tax-die-te.json'].rows['61091000110Y'];
  const inject=code=>{const s=code.indexOf('const data=')+11,e=code.indexOf(';const require',s);return code.slice(0,s)+JSON.stringify(changed)+code.slice(e);};
  assert.deepEqual(run(inject(p.after)),run(inject(p.before)));
});
test('existing upstream/commercial schemas accept honest provenance without contract changes',()=>{
  const source=fs.readFileSync(new URL('../lib/courier/n8n-contract.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};runInNewContext(compiled,{exports,require:createRequire(import.meta.url)},{timeout:5000});
  const output=run(p.after),parsed=exports.courierUpstreamResponseSchema.parse(output);
  assert.equal(parsed.auditoria.taxResolutions[0].estimation.components[0].method,'FAMILY_SNAPSHOT');
  const oldKeys=Object.keys(exports.courierResponseSchema.parse(run(p.before))).sort();
  assert.deepEqual(Object.keys(exports.courierResponseSchema.parse(output)).sort(),oldKeys);
});

test('save explicit local comparison evidence (not live agent behavior)',()=>{
  const dir=new URL('../docs/evidence/pcram-family-die-prepared-2026-10-10/',import.meta.url);
  for(const [name,value] of Object.entries({'tool-replay.offline.json':responses,'baseline-calculation.offline.json':run(p.before),'candidate-calculation.offline.json':run(p.after)}))
    fs.writeFileSync(new URL(name,dir),JSON.stringify(value,null,2)+'\n');
});
