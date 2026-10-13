// Local contract fixtures, not new model output or observed web requests.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runInNewContext} from 'node:vm';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {prepare,out,root,sha} from '../scripts/prepare-pcram-web-directed.mjs';
import {auditClassification} from '../workflow/pcram-classification-guard.mjs';
import {loadPackedNomenclator,queryPackedNomenclator} from '../workflow/pcram-nomenclator-packed.mjs';
const packed=JSON.parse(fs.readFileSync(new URL('data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json',root)));
const source=packed.metadata.zip_sha256,p=prepare();
const q=(prefijo,indice=1)=>({indice,prefijo,texto:'',limite:1,vista:'detalle'});
const query=input=>structuredClone(queryPackedNomenclator(loadPackedNomenclator(packed),input));
const step=(input,r=query(input))=>({action:{tool:'Consulta_nomenclador_PCRAM',toolInput:input},observation:JSON.stringify([{response:JSON.stringify(r)}])});
const trace=JSON.parse(fs.readFileSync(new URL('docs/evidence/pcram-user-qa-34575-2026-10-13/selected-trace.json',root)));
const input=trace.input;
const fullCotton=query(q('61091000')).results[0].ncm_context;
// Natural product attributes in a controlled input fixture; no catalog text
// copied into the description. Not a new Alibaba observation or model response.
const naturalCotton='Remera de running 100% algodón';
const cottonRequest={...input,productos:[{link:'https://www.alibaba.com/product-detail/fixture-cotton.html',descripcion:naturalCotton}]};
const product=(clasificacion='6109',SIM=null,verificacion)=>({indice:1,producto:'Camiseta',clasificacion,SIM,DIE:20,evidencia:[],fundamento:'Controlled fixture',...(verificacion?{verificacion}:{})});
const cottonProof={codigo_candidato:'61091000',familia_sustentada:'6109',atributos:[{fuente:'descripcion',cita:naturalCotton}],motivo_aproximacion:''};
const audit=(prod,steps,request=input)=>auditClassification([prod],steps,source,request)[0];
const runValidator=(w,prod,steps,request=input)=>JSON.parse(JSON.stringify(runInNewContext(`(function(){${w.nodes[7].parameters.jsCode}})()`,{
 $input:{first:()=>({json:{output:{productos:[prod]},intermediateSteps:steps}})},$:()=>({first:()=>({json:{solicitud:request}})}),URL
},{timeout:5000})))[0].json;
const calculate=(parsed,steps)=>{
 class FixedDate extends Date {constructor(v){super(v??'2026-10-13T14:39:53Z');}static now(){return +new Date('2026-10-13T14:39:53Z');}}
 return JSON.parse(JSON.stringify(runInNewContext(`(function(){${p.candidate.nodes[9].parameters.jsCode}})()`,{
  $input:{first:()=>({json:parsed})},$:()=>({first:()=>({json:{intermediateSteps:steps}})}),Date:FixedDate
 },{timeout:5000})))[0].json.respuesta;
};

test('recorded #34575 precise inference remains rejected; explicit HS4 fallback is preserved without trimming',()=>{
 const steps=trace.tool_calls.map(c=>step(c.toolInput));
 const before=runValidator(p.baseline,trace.agent_original,steps).productos[0];
 assert.equal(before.clasificacion,null);
 const implicit=audit(trace.agent_original,steps);assert.equal(implicit.clasificacion,null);
 const explicit={...trace.agent_original,clasificacion:'6109',SIM:null,verificacion:{codigo_candidato:'61099000',familia_sustentada:'6109',atributos:[],motivo_aproximacion:'Composición no declarada'}};
 const after=runValidator(p.candidate,explicit,steps).productos[0];
 assert.equal(after.clasificacion,'6109');assert.equal(after.SIM,null);assert.equal(after.DIE,20);
 assert.equal(after.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');assert.equal(after.clasificacion_qa.consultas[1].returned_count,10);
});

test('explicit partial fixture passes unchanged FAMILY_SNAPSHOT calculator, not numeric-target patch',()=>{
 const steps=[step(q('6109'))];
 const prod=product('6109',null,{codigo_candidato:null,familia_sustentada:'6109',atributos:[],motivo_aproximacion:'Falta composición'});
 const parsed=runValidator(p.candidate,prod,steps),r=calculate(parsed,steps);
 assert.equal(r.status,'cotizado');assert.equal(r.total_usd,931.88);assert.equal(r.flete_internacional_usd,580);assert.equal(r.handling_con_iva_usd,90.75);
 assert.equal(r.auditoria.taxResolutions[0].estimation.components[0].method,'FAMILY_SNAPSHOT');
 assert.equal(r.auditoria.productos[0].clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');
});

test('natural garment and verified composition retain directed NCM without generic PCRAM headings',()=>{
 const beforeSource=execFileSync('git',['show','da9c226:workflow/pcram-classification-guard.mjs'],{encoding:'utf8'}).replaceAll('export function','function');
 const before=runInNewContext(`(()=>{${beforeSource};return auditClassification;})()`,{URL});
 assert.equal(before([product('61091000',null,cottonProof)],[step(q('61091000'))],source,cottonRequest)[0].clasificacion,null);
 assert.ok(!naturalCotton.includes('complementos'));assert.ok(!naturalCotton.includes('vestir'));
 assert.match(fullCotton,/De algodón/);assert.match(fullCotton,/T-shirts/);
 const result=audit(product('61091000',null,cottonProof),[step(q('61091000'))],cottonRequest);
 assert.equal(result.clasificacion,'61091000');assert.equal(result.clasificacion_qa.nivel,'COINCIDENCIA_EXACTA');
 assert.equal(result.clasificacion_qa.atributos_verificados.length,1);
 assert.ok(!Object.hasOwn(result,'verificacion'));
 const quoted=calculate(runValidator(p.candidate,product('61091000',null,cottonProof),[step(q('61091000'))],cottonRequest),[step(q('61091000'))]);
 assert.equal(quoted.status,'cotizado');assert.equal(quoted.auditoria.taxResolutions[0].rates.duty,.2);assert.ok(quoted.auditoria.taxResolutions[0].dutyEvidence);
});

test('Web Search quote fixtures require surfaced URL citation bound to product page, not agent claim or URL name',()=>{
 const link=cottonRequest.productos[0].link,request={...input,productos:[{link,descripcion:'Camiseta running'}]};
 const proof={...cottonProof,atributos:[{fuente:link,cita:naturalCotton}]};
 const s=step(q('61091000'));s.action.messageLog=[{content:[{type:'text',text:naturalCotton,annotations:[{type:'url_citation',url:link,start_index:0,end_index:naturalCotton.length}]}]}];
 assert.equal(audit(product('61091000',null,proof),[s],request).clasificacion_qa.nivel,'COINCIDENCIA_EXACTA');
 for(const bad of [step(q('61091000')),{...s,action:{...s.action,messageLog:[{content:[{type:'text',text:naturalCotton}]}]}},{...s,action:{...s.action,messageLog:[{content:[{type:'text',text:naturalCotton,annotations:[{type:'url_citation',url:'https://other.example/',start_index:0,end_index:naturalCotton.length}]}]}]}}]){
  const result=audit(product('61091000',null,proof),[bad],request);assert.equal(result.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');assert.equal(result.clasificacion,null);
 }
});

test('real missing-composition description cannot accredit cotton or residual opening with model-only declarations',()=>{
 for(const ncm of ['61091000','61099000']){
  const proof={...cottonProof,codigo_candidato:ncm,atributos:[{fuente:'descripcion',cita:fullCotton}]};
  const result=audit(product(ncm,null,proof),[step(q(ncm))]);
  assert.equal(result.clasificacion,null);assert.equal(result.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');
 }
});

test('foreign/unsupported smartwatch classification and truncated SIM stay approximate, no rates from nomenclator',()=>{
 const request={...input,productos:[{link:'https://www.alibaba.com/product-detail/VALDUS-VS13.html',descripcion:'Smartwatch VALDUS VS13'}]};
 const result=audit(product('85176272','85176272900U',{codigo_candidato:'85176272900U',familia_sustentada:'851762',atributos:[],motivo_aproximacion:'Tecnología no verificada; SIM truncado'}),[step(q('85176272'))],request);
 assert.equal(result.SIM,null);assert.equal(result.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');assert.equal(result.DIE,20);
 const foreign=audit(product('91021200',null,{codigo_candidato:'91021200',atributos:[],motivo_aproximacion:'HS extranjero no acreditado en Argentina'}),[step(q('91021200'))],request);
 assert.equal(foreign.clasificacion,null);
});

test('construction blocks do not become wheeled toy NCM by presence of a candidate',()=>{
 const request={...input,productos:[{link:'https://www.alibaba.com/product-detail/Chengji.html',descripcion:'Juego de bloques para construcción de plástico'}]};
 const result=audit(product('95030010',null,{codigo_candidato:'95030010',familia_sustentada:'9503',atributos:[{fuente:'descripcion',cita:request.productos[0].descripcion}],motivo_aproximacion:'No se acreditan ruedas'}),[step(q('95030010'))],request);
 assert.equal(result.clasificacion,null);assert.equal(result.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');
});

test('NO_MATCH or inaccessible web preserves estimate and commercial continuity without inventing precise/family code',()=>{
 const prod=product('99999999',null,{codigo_candidato:'99999999',familia_sustentada:'9999',atributos:[],motivo_aproximacion:'Ficha inaccesible'});
 const steps=[step(q('99999999')),step(q('9999'))],parsed=runValidator(p.candidate,prod,steps);
 assert.equal(parsed.productos[0].clasificacion,null);assert.equal(parsed.productos[0].DIE,20);
 const r=calculate(parsed,steps);assert.equal(r.status,'cotizado');assert.equal(r.auditoria.taxResolutions[0].estimation.components[0].method,'AGENT_ESTIMATE');
});

test('source/product/query/URI/completeness/offset/errors and malformed observations cannot produce exact verdict',()=>{
 const valid=step(q('61091000'));
 const bads=[{...valid,observation:'{'}, {...valid,observation:JSON.stringify([{error:'fail'}])}, {...valid,observation:JSON.stringify([{response:valid.observation},{response:valid.observation}])}];
 for(const mutate of [r=>r.source.zip_sha256='wrong',r=>r.query.indice=2,r=>r.retrieval.complete=false,r=>r.partial=true,r=>r.results[0].source_uri='pcram://wrong',r=>r.returned_count--,r=>r.results[0].description_limits.ncm_field_full=true]){
  const r=query(q('61091000'));mutate(r);bads.push(step(q('61091000'),r));
 }
 bads.push(step({...q('61091000'),offset:0},query(q('61091000'))));
 for(const s of bads){const r=audit(product('61091000',null,cottonProof),[s],cottonRequest);assert.equal(r.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');assert.equal(r.clasificacion,null);}
 const other={...product('61091000',null,cottonProof),indice:2};assert.equal(audit(other,[valid],cottonRequest).clasificacion,null);
});

test('unverified family is not fabricated; contradictory attributes and excessive calls fail exact safely',()=>{
 const exact=product('61091000',null,cottonProof),s=step(q('61091000'));
 assert.equal(audit(exact,[s,s,s],cottonRequest).clasificacion,null);
 assert.equal(audit(exact,[s,{...s,observation:'{'},{...s,observation:'{'}],cottonRequest).clasificacion,null);
 assert.equal(audit({...exact,verificacion:{...cottonProof,motivo_aproximacion:'No se confirmó composición'}},[s],cottonRequest).clasificacion,null);
 const contradictoryRequest={...cottonRequest,productos:[{...cottonRequest.productos[0],descripcion:naturalCotton+' No es algodón.'}]};
 assert.equal(audit(exact,[s],contradictoryRequest).clasificacion,null);
 const mixed={...exact,verificacion:{...cottonProof,atributos:[...cottonProof.atributos,{fuente:'descripcion',cita:'Dato inventado ausente'}]}};
 assert.equal(audit(mixed,[s],cottonRequest).clasificacion,null);
 const noClaim=audit({...exact,verificacion:undefined},[s],cottonRequest);assert.equal(noClaim.clasificacion,null);
 const badFamily={...exact,verificacion:{...cottonProof,familia_sustentada:'8517'}};
 const r=audit(badFamily,[s,step(q('6109'))]);assert.equal(r.clasificacion,null);assert.equal(r.SIM,null);
});

test('optional output proof schema and literal validator operate together; model-supplied QA verdict overwritten',()=>{
 const result=runValidator(p.candidate,{...product('6109'),clasificacion_qa:{nivel:'COINCIDENCIA_EXACTA'}},[step(q('6109'))]);
 assert.equal(result.productos[0].clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');
 const parser=JSON.parse(p.candidate.nodes[6].parameters.inputSchema);
 assert.equal(parser.properties.productos.items.additionalProperties,false);assert.ok(!parser.properties.productos.items.required.includes('verificacion'));
 assert.equal(p.candidate.nodes[4].parameters.options.maxIterations,p.baseline.nodes[4].parameters.options.maxIterations);
});

test('exact three-field rollback preserves 12 nodes and every frozen field byte for byte',()=>{
 const restored=structuredClone(p.candidate);
 for(const c of p.changes){const keys=c.path.split('/').slice(1),key=keys.pop();keys.reduce((o,k)=>o[k],restored)[key]=c.before;assert.equal(sha(c.after),c.afterSha256);}
 assert.deepEqual(restored,p.baseline);assert.equal(p.changes.length,3);assert.equal(p.candidate.nodes.length,12);
 for(const i of [0,1,2,3,5,8,9,10,11])assert.deepEqual(p.candidate.nodes[i],p.baseline.nodes[i]);
 assert.deepEqual(p.candidate.connections,p.baseline.connections);assert.deepEqual(p.candidate.settings,p.baseline.settings);
 assert.equal(sha(p.candidate.nodes[9].parameters.jsCode),'2530f19f9fe18b928cbeb0cf4d2cbadc8c005e0a139f29d19c5fbf72bdc5be99');
});


test('natural cotton check requires both actual garment type and complete observed composition',()=>{
 for(const descripcion of ['Remera running','Pantalón 100% algodón','Algodón 100%','Remera 50% algodón 50% poliéster','Remera sin algodón','Remera 100 gramos algodón','Pantalón con etiqueta remera 100% algodón','Remera 100% algodón de tejido plano','Remera 100% algodón y 5% poliéster']){
  const request={...cottonRequest,productos:[{...cottonRequest.productos[0],descripcion}]};
  const proof={...cottonProof,atributos:[{fuente:'descripcion',cita:descripcion}]};
  const checked=audit(product('61091000',null,proof),[step(q('61091000'))],request);
  assert.equal(checked.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA',descripcion);
  assert.equal(checked.clasificacion,null,descripcion);assert.equal(checked.DIE,20);
 }
 const steps=[step(q('6109'))],request={...cottonRequest,productos:[{...cottonRequest.productos[0],descripcion:'Remera running'}]};
 const partial=audit(product('6109',null,{...cottonProof,familia_sustentada:'6109',atributos:[{fuente:'descripcion',cita:'Remera running'}],motivo_aproximacion:'Falta composición'}),steps,request);
 assert.equal(partial.clasificacion,'6109');assert.equal(partial.SIM,null);assert.equal(partial.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');
});

test('natural input cannot bypass source exceptions, numeric conditions or a truncated field',()=>{
 for(const mutate of [r=>r.results.forEach(x=>x.ncm_context+=' Excepto determinadas prendas.'),r=>r.results.forEach(x=>x.ncm_context+=' De peso superior a 1 kg.'),r=>r.results.forEach(x=>x.description_limits.ncm_field_full=true)]){
  const r=query(q('61091000'));mutate(r);
  const checked=audit(product('61091000',null,cottonProof),[step(q('61091000'),r)],cottonRequest);
  assert.equal(checked.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');assert.equal(checked.clasificacion,null);
 }
 const indirect=audit(product('61091000',null,cottonProof),[step(q('6109'))],cottonRequest);
 assert.equal(indirect.clasificacion,'6109');assert.equal(indirect.SIM,null);
 assert.equal(indirect.clasificacion_qa.nivel,'COINCIDENCIA_APROXIMADA');
});

test('microfix rollback is one validator field; total three-field patch still restores production baseline',()=>{
 const patch=JSON.parse(execFileSync('git',['show','da9c226:docs/evidence/pcram-web-directed-local-2026-10-13/apply.patch.json'],{encoding:'utf8'}));
 const old=structuredClone(p.baseline);
 for(const c of patch.changes){const k=c.path.split('/').slice(1),last=k.pop();k.reduce((x,key)=>x[key],old)[last]=c.after;}
 const restored=structuredClone(p.candidate);restored.nodes[7].parameters.jsCode=old.nodes[7].parameters.jsCode;
 assert.deepEqual(restored,old);assert.equal(restored.nodes.length,12);
 assert.equal(p.candidate.nodes[4].parameters.options.systemMessage,old.nodes[4].parameters.options.systemMessage);
 assert.equal(p.candidate.nodes[6].parameters.inputSchema,old.nodes[6].parameters.inputSchema);
 const whole=structuredClone(p.candidate);for(const c of p.changes){const k=c.path.split('/').slice(1),last=k.pop();k.reduce((x,key)=>x[key],whole)[last]=c.before;}
 assert.deepEqual(whole,p.baseline);
 const beforeSource=execFileSync('git',['show','da9c226:workflow/pcram-classification-guard.mjs'],{encoding:'utf8'});
 assert.equal(fs.readFileSync(new URL('workflow/pcram-classification-guard.mjs',root),'utf8').split('// QA evidence boundary')[0],beforeSource.split('// QA evidence boundary')[0]);
});

test('measure local query bytes/latency and prompt delta without claiming model token cost or performance improvement',()=>{
 const samples=[];
 for(const input of [q('6109'),q('61091000'),q('85176272'),q('95030060')]){
  const start=performance.now(),result=query(input);samples.push({query:input,ms:performance.now()-start,bytes:Buffer.byteLength(JSON.stringify(result)),count:result.returned_count,complete:result.retrieval.complete});
 }
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(new URL('local-measurements.json',out),JSON.stringify({node:process.version,mode:'single_local_sample_no_model_calls',baseline_real_execution_seconds:14.978,prompt_before_bytes:Buffer.byteLength(p.baseline.nodes[4].parameters.options.systemMessage),prompt_after_bytes:Buffer.byteLength(p.candidate.nodes[4].parameters.options.systemMessage),samples,token_use_measured:false,warning:'Fixtures do not establish real agent effectiveness; no cloud/model time or cost measured.'},null,2)+'\n');
});
