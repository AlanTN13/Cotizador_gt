// OFFLINE tests only. No quote requests, no OpenAI/n8n/Vercel API traffic.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {prepareTariffAndPcramPatch} from '../scripts/prepare-globaltrip-rates-pcram.mjs';

const {baseline,candidate,changes,baselineVersion}=prepareTariffAndPcramPatch();
function calculate(workflow,kg) {
 const simulated={
  solicitud:{solicitud_id:'tariff-offline',fob_usd:500,cantidad:1,
   productos:[{descripcion:'Remera de running',link:''}],
   bultos:[{cantidad:1,peso_kg:kg,largo_cm:1,ancho_cm:1,alto_cm:1}]},
  productos:[{indice:1,producto:'Remera de running',clasificacion:null,SIM:null,DIE:20,
   evidencia:[],fundamento:'Only a controlled offline tax estimate'}],
 };
 class FixedDate extends Date {
  constructor(v){super(v??'2026-10-13T14:39:53Z');}
  static now(){return +new Date('2026-10-13T14:39:53Z');}
 }
 const items=runInNewContext('(function(){'+workflow.nodes[9].parameters.jsCode+'})()',{
  $input:{first:()=>({json:simulated})},
  $:()=>({first:()=>({json:{intermediateSteps:[]}})}),
  Date:FixedDate,
 },{timeout:6000});
 return JSON.parse(JSON.stringify(items))[0].json.respuesta;
}
const sameMoney=(a,b)=>assert.ok(Math.abs(a-b)<0.005,String(a)+' !== '+String(b));

test('patch reconstructs published baseline and touches ONLY agent prompt + calculator',()=>{
 assert.equal(baselineVersion,'f25077ba-8c75-49a5-99f2-8473a70d1fd9');
 assert.equal(baseline.nodes.length,12);
 assert.deepEqual(changes.map(c=>c.path),[
  '/nodes/4/parameters/options/systemMessage','/nodes/9/parameters/jsCode']);
 const restored=structuredClone(candidate);
 for(const c of changes){
  const keys=c.path.split('/').slice(1),name=keys.pop();
  const set=keys.reduce((o,key)=>o[key],restored);
  const from=keys.reduce((o,key)=>o[key],baseline);
  set[name]=from[name];
 }
 assert.deepEqual(restored,baseline);
});
test('tariff thresholds preserve existing tier boundaries and half-kilo rounding',()=>{
 const scenarios=[
  [19,26.88,24],[20,26.88,24],[20.01,22.4,20],
  [20.5,22.4,20],[21,22.4,20],[29,22.4,20],[30,22.4,20],
  [30.01,21.28,19],[30.5,21.28,19],[31,21.28,19],
 ];
 for(const [weight,rate,previousRate] of scenarios){
  const expectedWeight=Math.ceil(weight*2)/2;
  const previous=calculate(baseline,weight),updated=calculate(candidate,weight);
  assert.equal(previous.status,'cotizado',String(weight));
  assert.equal(updated.status,'cotizado',String(weight));
  assert.equal(updated.peso_considerado_kg,expectedWeight);
  assert.equal(updated.auditoria.tarifa_usd_kg,rate);
  assert.equal(previous.auditoria.tarifa_usd_kg,previousRate);
  sameMoney(updated.flete_internacional_usd,Math.round(expectedWeight*rate*100)/100);
  sameMoney(updated.total_usd-previous.total_usd,updated.flete_internacional_usd-previous.flete_internacional_usd);
  assert.equal(updated.impuestos_y_tasas_usd,previous.impuestos_y_tasas_usd);
  assert.equal(updated.auditoria.cif_usd,previous.auditoria.cif_usd);
  assert.equal(updated.handling_con_iva_usd,90.75);
 }
});
test('real observed QA weights change only international freight, not taxes or handling',()=>{
 const shirt=calculate(candidate,29),watchToy=calculate(candidate,19);
 sameMoney(shirt.flete_internacional_usd,649.60);
 sameMoney(watchToy.flete_internacional_usd,510.72);
 const beforeShirt=calculate(baseline,29),beforeWatchToy=calculate(baseline,19);
 assert.equal(beforeShirt.flete_internacional_usd,580);
 assert.equal(beforeWatchToy.flete_internacional_usd,456);
 assert.equal(shirt.auditoria.cif_usd,beforeShirt.auditoria.cif_usd);
 assert.equal(watchToy.auditoria.cif_usd,beforeWatchToy.auditoria.cif_usd);
});
test('per-product PCRAM prompt requires family lookup and a second attempt after NO_MATCH',()=>{
 const previous=baseline.nodes[4].parameters.options.systemMessage;
 const text=candidate.nodes[4].parameters.options.systemMessage;
 assert.notEqual(text,previous);
 assert.match(text,/POR PRODUCTO/);
 assert.match(text,/no omitas Consulta_nomenclador_PCRAM/);
 assert.match(text,/Si NO_MATCH/);
 assert.match(text,/una sola segunda consulta/);
 assert.match(text,/9503\/950300/);
 assert.match(text,/vista="ramas"/);
 assert.match(text,/vista="detalle"/);
 assert.match(text,/máximo dos consultas PCRAM POR PRODUCTO/);
 assert.match(text,/SIM=null/);
 assert.match(text,/maxIterations=8/);
});
test('QA tariff label changes without disturbing tax rows',()=>{
 const web=fs.readFileSync(new URL('../lib/courier/calculation-detail.ts',import.meta.url),'utf8');
 assert.match(web,/Escala China 26,88 \/ 22,40 \/ 21,28/);
 assert.doesNotMatch(web,/Escala China 24 \/ 20 \/ 19/);
});
