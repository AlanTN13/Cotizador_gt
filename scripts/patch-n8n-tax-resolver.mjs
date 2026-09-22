// Offline, guarded patch. Does not call n8n, import a workflow or publish anything.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {canonicalParameters} from '../workflow/n8n-parameter-normalization.mjs';
const [input,output]=process.argv.slice(2);
if(!input || !output || resolve(input)===resolve(output)) throw Error('Usage: node scripts/patch-n8n-tax-resolver.mjs exported-live.json candidate.json (distinct files)');
const live=JSON.parse(fs.readFileSync(input,'utf8'));
const candidate=JSON.parse(fs.readFileSync(new URL('../workflow/GlobalTrip-Courier-V1.n8n.json',import.meta.url),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('../workflow/tax-resolver-manifest.json',import.meta.url),'utf8'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const nodes=live.nodes.filter(n=>n.name==='Cotizador deterministico');
if(nodes.length!==1 || nodes[0].type!=='n8n-nodes-base.code')throw Error('Expected exactly one existing calculator Code Node');
const target=nodes[0], code=candidate.nodes.find(n=>n.name===target.name).parameters.jsCode;
if(sha(code)!==manifest.patchedCalculatorSha256)throw Error('Candidate code differs from reviewed manifest; rebuild and validate');
const currentHash=sha(target.parameters.jsCode);
if(![manifest.baselineCalculatorSha256,manifest.patchedCalculatorSha256].includes(currentHash))
  throw Error('Live calculator differs from reviewed baseline; reconcile it before applying the patch');
for(const guard of manifest.contractGuards){
  const matches=live.nodes.filter(n=>n.name===guard.name);
  if(matches.length!==1 || sha(JSON.stringify(canonicalParameters(guard.name,matches[0].parameters)))!==guard.parametersSha256)
    throw Error(`Live contract differs at ${guard.name}; reconcile before applying the patch`);
}
target.parameters.jsCode=code;
fs.writeFileSync(output,JSON.stringify(live,null,2)+'\n',{flag:'wx'});
console.log('Candidate written: calculator code only. IDs, connections, credentials, records and settings preserved. Not published.');
