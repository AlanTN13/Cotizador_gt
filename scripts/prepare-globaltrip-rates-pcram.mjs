// Offline preparation ONLY. Reconstruct the last verified published n8n workflow.
// No n8n API calls, model calls, quote requests, source downloads or deployment.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {prepare as preparePrevious,sha,root} from './prepare-pcram-web-directed.mjs';

const read = path => fs.readFileSync(new URL(path,root),'utf8');
const out = new URL('docs/evidence/globaltrip-rates-pcram-2026-10-14/',root);
const publishedPromptPath='docs/evidence/pcram-web-directed-local-2026-10-13/prompt.after.txt';
const baselineVersion='f25077ba-8c75-49a5-99f2-8473a70d1fd9';
const oldRate='const tarifa=cmp(peso,dec(20))<=0n?24:cmp(peso,dec(30))<=0n?20:19;';
const newRate='const tarifa=cmp(peso,dec(20))<=0n?26.88:cmp(peso,dec(30))<=0n?22.4:21.28;';
const promptMarker='Investigación y contraste dirigido (precotización, no dictamen):';

const get=(data,path)=>path.split('/').slice(1).reduce((o,k)=>o[k],data);
const set=(data,path,value)=>{
 const parts=path.split('/').slice(1),k=parts.pop();
 parts.reduce((o,key)=>o[key],data)[k]=value;
};
export function prepareTariffAndPcramPatch() {
 // Existing published state was reconstructed and attested by 236522a release.
 // The earlier preparer reads the revised instruction file; restore the EXACT
 // last-published prompt before deriving the new two-field patch.
 const baseline=preparePrevious().candidate;
 const actualPrompt=read(publishedPromptPath);
 const promptPath='/nodes/4/parameters/options/systemMessage';
 const calculatorPath='/nodes/9/parameters/jsCode';
 set(baseline,promptPath,actualPrompt);
 assert.equal(baseline.nodes.length,12,'No additional nodes permitted');
 assert.equal(sha(actualPrompt),'2aef79b5933f07ea5ea98d525275a67e21bcf36fa098c43f6def5577be21fc2c',
  'Published prompt baseline has changed');
 assert.equal(sha(get(baseline,'/nodes/6/parameters/inputSchema')),
  'e1a06ce5d25d19859750f7bec633dfd7b260f85aa329d38495242f4a7a2e1afd',
  'Output schema must remain frozen');
 assert.equal(sha(get(baseline,'/nodes/7/parameters/jsCode')),
  '7d48a06378f50cb0ca0498a4b7fcff43ec37f054df716e9d2956babecf3b0133',
  'Classification guard must remain frozen');
 const originalCalculator=get(baseline,calculatorPath);
 assert.equal(sha(originalCalculator),
  '2530f19f9fe18b928cbeb0cf4d2cbadc8c005e0a139f29d19c5fbf72bdc5be99',
  'Current published calculator baseline mismatch');
 assert.equal(originalCalculator.split(oldRate).length,2,'Tariff anchor missing or ambiguous');
 assert.equal(actualPrompt.split(promptMarker).length,2,'Published PCRAM prompt anchor missing or ambiguous');
 const nextInstructions=read('workflow/pcram-web-directed-instructions.txt');
 assert.ok(nextInstructions.startsWith(promptMarker),'Instruction source has changed format');
 assert.notEqual(nextInstructions,actualPrompt.slice(actualPrompt.indexOf(promptMarker)),'No PCRAM delta');
 const candidate=structuredClone(baseline);
 set(candidate,promptPath,actualPrompt.slice(0,actualPrompt.indexOf(promptMarker))+nextInstructions);
 set(candidate,calculatorPath,originalCalculator.replace(oldRate,newRate));
 // Prove full workflow identity outside exactly these two fields.
 const restored=structuredClone(candidate);
 set(restored,promptPath,get(baseline,promptPath));
 set(restored,calculatorPath,get(baseline,calculatorPath));
 assert.deepEqual(restored,baseline,'An unexpected workflow field changed');
 const changes=[promptPath,calculatorPath].map(path=>({
  path,
  nodeId:baseline.nodes[Number(path.split('/')[2])].id,
  beforeSha256:sha(get(baseline,path)),afterSha256:sha(get(candidate,path)),
  before: path===calculatorPath?oldRate:actualPrompt.slice(actualPrompt.indexOf(promptMarker)),
  after: path===calculatorPath?newRate:nextInstructions,
  mode:'verified_single_string_substitution',
 }));
 return {baseline,candidate,changes,baselineVersion};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const p=prepareTariffAndPcramPatch();
 fs.mkdirSync(out,{recursive:true});
 const plan={status:'LOCAL_PATCH_RECIPE_ONLY_NOT_PUBLISHED',productionVersionLastVerified:p.baselineVersion,
  workflowId:'LO9m0AxSrxRR6JVY',nodes:12,
  inputSource:'Last published 236522a workflow reconstructed from immutable repository receipt',
  requiredPreflight:'Fresh authenticated GET of live n8n before writing; backup, hash compare, all frozen fields and concurrent version',
  changes:p.changes,rollback:p.changes.map(c=>({...c,beforeSha256:c.afterSha256,
   afterSha256:c.beforeSha256,before:c.after,after:c.before})),
  webQaFile:'lib/courier/calculation-detail.ts',
  noChangesTo:['tax snapshot','TaxResolver','FAMILY_SNAPSHOT','customs freight','CIF','handling','IVA','PCRAM tool/index/guard','model','credentials','connections','gateway'],
  publicationAuthorized:false,cloudCalls:0,quoteRequests:0};
 fs.writeFileSync(new URL('patch.recipe.json',out),JSON.stringify(plan,null,2)+'\n');
 console.log(JSON.stringify({status:plan.status,changedPaths:p.changes.map(x=>x.path),
  before:p.changes.map(x=>x.beforeSha256),after:p.changes.map(x=>x.afterSha256)},null,2));
}
