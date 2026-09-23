// Rebuild only the calculator node. Never recreate the workflow, connections,
// agent, credentials, node IDs, settings or publication metadata.
import fs from 'node:fs';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {canonicalParameters} from './n8n-parameter-normalization.mjs';
const source=fs.readFileSync(new URL('../lib/courier/tax-resolver.ts',import.meta.url),'utf8');
const runtime=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2022}}).outputText
  .replace(/from "\.\.\/\.\.\/data\/([^"\n]+\.json)";/g,'from "../data/$1" with { type: "json" };');
fs.writeFileSync(new URL('./tax-runtime.mjs',import.meta.url),'// Generated from lib/courier/tax-resolver.ts; run node workflow/build-workflow.mjs.\n'+runtime);
const {calculate}=await import('./workflow-source.mjs');
const {resolveProductTaxes}=await import('./tax-adapter.mjs');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const inputs=Object.fromEntries(['tax-die-te.json','tax-vat.json','tax-estimation-policy.json'].map(file=>[
  '../../data/'+file,JSON.parse(fs.readFileSync(new URL('../data/'+file,import.meta.url),'utf8'))]));
const embedded=`const taxResolver=(()=>{const exports={};const data=${JSON.stringify(inputs)};const require=id=>{if(!Object.hasOwn(data,id))throw Error('Unsupported dependency');return data[id];};\n${compiled}\nreturn exports;})();\nconst estimationPolicy=${JSON.stringify(inputs['../../data/tax-estimation-policy.json'])};`;
const target=new URL('./GlobalTrip-Courier-V1.n8n.json',import.meta.url);
const workflow=JSON.parse(fs.readFileSync(target,'utf8'));
const node=workflow.nodes.find(n=>n.name==='Cotizador deterministico');
if(!node || node.type!=='n8n-nodes-base.code')throw Error('Existing calculator node missing');
node.parameters.jsCode=`${embedded}\n${resolveProductTaxes.toString()}\n${calculate.toString()}\nreturn [{json:calculate($input.first().json)}];`;
fs.writeFileSync(target,JSON.stringify(workflow,null,2)+'\n');
const baseline=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/n8n-production-before-tax.json',import.meta.url),'utf8'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const guardNames=['Validar formulario','Preparar agente','Agente Despachante','OpenAI Chat Model','Salida estructurada','Validar salida del agente'];
fs.writeFileSync(new URL('./tax-resolver-manifest.json',import.meta.url),JSON.stringify({
  baseCommit:'38c52a72abecdbfc87aaf1893751c67d87b53749',
  nodeName:node.name,baselineCalculatorSha256:sha(baseline.nodes.find(n=>n.name===node.name).parameters.jsCode),
  patchedCalculatorSha256:sha(node.parameters.jsCode),
  contractGuards:baseline.nodes.filter(n=>guardNames.includes(n.name)).map(n=>({name:n.name,parametersSha256:sha(JSON.stringify(canonicalParameters(n.name,n.parameters)))})),
  sources:Object.entries(inputs).map(([path,data])=>({path,version:data.version,sha256:sha(JSON.stringify(data))}))
},null,2)+'\n');
console.log('Updated only Cotizador deterministico; offline resolver and sources embedded.');
