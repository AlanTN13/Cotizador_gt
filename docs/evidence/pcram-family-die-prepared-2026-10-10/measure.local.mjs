import fs from 'node:fs';import {Script} from 'node:vm';import {performance} from 'node:perf_hooks';
const mode=process.argv[2],root=process.argv[3],dir=root+'/docs/evidence/pcram-family-die-prepared-2026-10-10/';
const code=fs.readFileSync(dir+'calculator.'+mode+'.js','utf8');
const input=JSON.parse(fs.readFileSync(root+'/docs/evidence/pcram-cloud-qa-34448/validator-output.transcribed.json','utf8'));
const responses=JSON.parse(fs.readFileSync(dir+'tool-replay.offline.json','utf8'));
const steps=responses.map(r=>({action:{tool:'Consulta_nomenclador_PCRAM',toolInput:r.query},observation:JSON.stringify([{response:JSON.stringify(r)}])}));
const now=new Date('2026-10-10T13:02:16Z');class FixedDate extends Date{constructor(v){super(v??+now);}static now(){return +now;}}
const start=performance.now(),script=new Script('(function(){'+code+'})()'),compileMs=performance.now()-start;
const t=performance.now();const result=script.runInNewContext({$input:{first:()=>({json:input})},$:()=>({first:()=>({json:{intermediateSteps:steps}})}),Date:FixedDate},{timeout:5000})[0].json.respuesta;
console.log(JSON.stringify({mode,codeBytes:Buffer.byteLength(code),compileMs,evaluateMs:performance.now()-t,maxRSSNodeKB:process.resourceUsage().maxRSS,heapUsedBytes:process.memoryUsage().heapUsed,total:result.total_usd,scope:'one isolated local Node process; not n8n Cloud shared memory measurement'}));
