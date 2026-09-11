// UI contract verification with mocked fetch responses. Never calls n8n.
// Run with a local dev server on 3018 and AGENT_BROWSER_BIN pointing to the CLI.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const bin = process.env.AGENT_BROWSER_BIN || 'agent-browser';
const session = 'globaltrip-n8n-ui-tests';
const out = resolve('docs/evidence/n8n'); mkdirSync(out, {recursive:true});
function call(...args) {
  const cmd = bin.endsWith('.js') ? process.execPath : bin;
  const prefix = bin.endsWith('.js') ? [bin] : [];
  const raw = execFileSync(cmd, [...prefix, '--session',session,'--json',...args], {encoding:'utf8',timeout:30000});
  const data=JSON.parse(raw); assert.equal(data.success,true,raw); return data.data;
}
const evaluate = source => call('eval',source).result;
const fill = (label,value) => call('find','label',label,'fill',String(value));
const click = label => { evaluate('Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim() === '+JSON.stringify(label)+').focus()'); call('press','Enter'); call('wait','500'); };
const capture = name => call('screenshot',resolve(out,name+'.png'),'--full');
call('open', 'http://localhost:3018/cotizador');
evaluate(`(() => {
 window.__cases=[]; window.__queue=[
 {status:'falta_info',preguntas_faltantes:[{id:'material',pregunta:'¿Cuál es el material?',motivo:'Identifica la variante.'},{id:'uso',pregunta:'¿Cuál es su uso?',motivo:'Confirma la función.'}]},
 {status:'falta_info',preguntas_faltantes:[{id:'potencia',pregunta:'¿Qué potencia tiene?',motivo:'Distingue la variante.'}]},
 {networkError:true},
 {status:'cotizado',total_usd:1439.99,flete_internacional_usd:646,handling_con_iva_usd:90.75,impuestos_y_tasas_usd:703.24,peso_considerado_kg:34,SIM:'84145190100R',DIE:20},
 {status:'revision'}, {status:'no_apto'} ];
 const original=window.fetch;
 window.fetch=async (url,options) => {
   if(url!='/api/cotizador') return original(url,options);
   const body=JSON.parse(options.body); window.__cases.push(body);
   const next=window.__queue.shift(); if(!next) throw Error('Mock exhausted — no real request allowed');
   await new Promise(r=>setTimeout(r,100));
   if(next.networkError) throw new TypeError('Simulated network failure');
   return new Response(JSON.stringify({solicitud_id:body.solicitud_id,mensaje:'PRUEBA SIMULADA DE INTERFAZ. No es una cotización real.',...next}),{status:200,headers:{'content-type':'application/json'}});
 };
})()`);
fill('Link del producto','https://example.com/producto-ficticio-prueba');
fill('Descripción del producto','Producto ficticio de prueba de interfaz, sin operación comercial.');
fill('Cantidad de unidades',100); fill('Valor FOB total de este producto (USD)',1000);
fill('Peso bruto de cada caja (kg)',12); fill('Largo (cm)',50); fill('Ancho (cm)',40); fill('Alto (cm)',40);
click('+ Agregar otro grupo');
call('find','nth','7','input[type=number]','fill','2');
call('find','nth','8','input[type=number]','fill','2');
call('find','nth','9','input[type=number]','fill','10');
call('find','nth','10','input[type=number]','fill','20');
call('find','nth','11','input[type=number]','fill','30');
click('Cotizar mi envío →');
call('wait','[data-status="falta_info"]');
assert.equal(evaluate('document.querySelectorAll("[data-status] textarea").length'),2);
fill('¿Cuál es el material?','Acero'); fill('¿Cuál es su uso?','Doméstico');
assert.equal(evaluate('Boolean(document.querySelector("[data-status=falta_info]"))'),true);
capture('simulado-falta-info');
click('Enviar aclaraciones y continuar →'); call('wait','[data-status="falta_info"]');
fill('¿Qué potencia tiene?','50 W'); click('Enviar aclaraciones y continuar →'); call('wait','[role=alert]');
assert.equal(evaluate('document.querySelector("[data-status]")'),null);
click('Reintentar solicitud'); call('wait','[data-status="cotizado"]'); capture('simulado-cotizado');
let cases=evaluate('window.__cases');
assert.equal(cases.length,4);
assert.deepEqual(cases.map(c=>c.aclaraciones.length),[0,2,3,3]);
assert.equal(new Set(cases.map(c=>c.solicitud_id)).size,1);
assert.deepEqual(cases[2],cases[3]);
for(const c of cases) {
 assert.equal(c.bultos.length,2); assert.deepEqual(c.bultos,cases[0].bultos);
 assert.equal(c.link,cases[0].link); assert.equal(c.descripcion,cases[0].descripcion);
 assert.equal(c.fob_usd,1000); assert.equal(c.cantidad,100);
 assert.deepEqual(Object.keys(c).sort(),['aclaraciones','bultos','cantidad','descripcion','fob_usd','link','solicitud_id']);
}
assert.match(evaluate('document.querySelector("[data-status]").innerText'),/84145190100R/);
click('Cotizar mi envío →'); call('wait','[data-status="revision"]'); capture('simulado-revision');
assert.doesNotMatch(evaluate('document.querySelector("[data-status]").innerText'),/Total aproximado|84145190100R/);
click('Cotizar mi envío →'); call('wait','[data-status="no_apto"]'); capture('simulado-no-apto');
assert.doesNotMatch(evaluate('document.querySelector("[data-status]").innerText'),/Total aproximado|84145190100R/);
call('set','viewport','390','844'); capture('simulado-mobile');
assert.equal(evaluate('document.documentElement.scrollWidth <= window.innerWidth'),true);
assert.equal(evaluate('Boolean(document.querySelector("[data-nextjs-dialog]"))'),false);
click('Empezar otro caso');
assert.equal(evaluate('document.querySelector("input[type=url]").value'),'');
writeFileSync(resolve(out,'browser-simulated.json'),JSON.stringify({at:new Date().toISOString(),mode:'MOCKED UI RESPONSES — no real n8n classification',passed:true,checks:['four inline statuses','two clarification rounds','same solicitud_id','all product and parcel data retained','network retry uses identical payload','no duplicate clarifications','no stale quote in revision/no_apto','mobile without horizontal overflow','new case resets data','no Next error overlay'],requests:cases},null,2));
call('close');
console.log('PASS: browser UI, four states, clarification rounds, failure/retry, data retention, mobile. Responses were simulated.');
