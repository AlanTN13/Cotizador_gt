// Offline field patch only. No workflow writes, HTTP, downloads or model calls.
import fs from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sha256Ascii,estimateFamilyDuty} from '../workflow/tax-family-estimate.mjs';
import {resolveProductTaxes} from '../workflow/tax-adapter.mjs';
const root=new URL('../',import.meta.url), read=p=>fs.readFileSync(new URL(p,root),'utf8');
export const baselinePath='docs/evidence/pcram-agent-retry-prepared-2026-10-09/publication-api-2026-10-10/published.api-export.json';
export const indexPath='data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json';
export const sha=s=>createHash('sha256').update(s).digest('hex');
export function prepare() {
  const baseline=JSON.parse(read(baselinePath));
  const node=baseline.nodes.find(n=>n.name==='Cotizador deterministico'),before=node.parameters.jsCode;
  const er9=JSON.parse(read('docs/evidence/pcram-er9-die-6109-2026-10-10/comparison.json'));
  if(baseline.nodes.length!==12 || baseline.versionId!==er9.saved_published_workflow.version_id ||
      sha(before)!==er9.saved_published_workflow.calculator_js_sha256) throw Error('Saved baseline differs from verified ER9 export');
  const start=before.indexOf('const data=')+'const data='.length,end=before.indexOf(';const require',start);
  const data=JSON.parse(before.slice(start,end)),tax=data['../../data/tax-die-te.json'],packed=JSON.parse(read(indexPath));
  if(sha(read(indexPath))!==er9.classification_index.artifact_sha256 ||
      packed.metadata.tax_snapshot_sha256!==tax.source.sha256) throw Error('Frozen sources differ');
  const byPrefix=new Map();let newest='';
  // Reuse every existing HS4 shard exactly once; no new catalog, labels or rates.
  for(const block of Object.values(packed.shards)) {
    const decoded=inflateRawSync(Buffer.from(block[2],'base64'));
    let a=1,b=0;for(const byte of decoded){a=(a+byte)%65521;b=(b+a)%65521;}
    if(decoded.length!==block[0] || ((b*65536+a)>>>0)!==block[1]) throw Error('Shard integrity mismatch');
    for(const group of JSON.parse(decoded.toString('latin1'))) for(const row of group[2]) {
      const sim=row[0];if(!/^\d{11}[A-Z]$/.test(sim)) throw Error('Invalid frozen SIM');
      if(row[2]>newest)newest=row[2];
      for(const size of [4,6]) {const prefix=sim.slice(0,size);if(!byPrefix.has(prefix))byPrefix.set(prefix,[]);byPrefix.get(prefix).push(sim);}
    }
  }
  const taxFamilies=new Map();
  for(const sim of Object.keys(tax.rows))for(const size of [4,6]){
    const prefix=sim.slice(0,size);if(!taxFamilies.has(prefix))taxFamilies.set(prefix,[]);taxFamilies.get(prefix).push(sim);
  }
  const families={},rejected=[];
  for(const [prefix,list] of byPrefix) {
    const codes=list.sort(),actual=(taxFamilies.get(prefix)||[]).sort();
    if(JSON.stringify(codes)!==JSON.stringify(actual)){rejected.push(prefix);continue;}
    const rows=codes.map(sim=>[sim,tax.rows[sim].duty,tax.rows[sim].statistical,tax.rows[sim].updatedAt]);
    families[prefix]=[codes.length,sha(JSON.stringify(codes)),sha(JSON.stringify(rows))];
  }
  const proof={schema:'pcram-family-coverage-sha256-v1',taxVersion:tax.version,taxSource:tax.source,
    classification:packed.metadata,classificationUpdatedAt:newest,families};
  const adapterStart=before.indexOf('function resolveProductTaxes('),calcStart=before.indexOf('function calculate(');
  const oldCall='resolveProductTaxes(p,i,now,taxResolver,estimationPolicy)';
  if(adapterStart<0||calcStart<0||!before.slice(calcStart).includes(oldCall))throw Error('Calculator boundaries differ');
  const additions=`const familyCoverageProof=${JSON.stringify(proof)};\n${sha256Ascii.toString()}\n${estimateFamilyDuty.toString()}\n`;
  const newCall=oldCall.slice(0,-1)+",{proof:familyCoverageProof,steps:(()=>{try{return $('Agente Despachante').first().json.intermediateSteps;}catch{return [];}})()})";
  const after=before.slice(0,adapterStart)+additions+resolveProductTaxes.toString()+'\n'+before.slice(calcStart).replace(oldCall,newCall);
  const apply={nodeName:node.name,nodeId:node.id,field:'parameters.jsCode',beforeSha256:sha(before),afterSha256:sha(after),value:after};
  const rollback={...apply,beforeSha256:sha(after),afterSha256:sha(before),value:before};
  return {baseline,before,after,proof,apply,rollback,rejected,data,
    metadata:{baselinePath,indexPath,baselineVersion:baseline.versionId,nodeCount:baseline.nodes.length,
      baselineArtifactSha256:sha(read(baselinePath)),indexArtifactSha256:sha(read(indexPath)),
      beforeSha256:sha(before),afterSha256:sha(after),beforeBytes:Buffer.byteLength(before),afterBytes:Buffer.byteLength(after),
      proofBytes:Buffer.byteLength(JSON.stringify(proof)),eligibleCoveragePrefixes:Object.keys(families).length,
      rejectedCoveragePrefixes:rejected,control6109:families['6109'],
      patchFields:['Cotizador deterministico.parameters.jsCode'],published:false}};
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
  const out=process.argv[2];if(!out)throw Error('Provide an offline evidence directory');
  fs.mkdirSync(out,{recursive:true});const p=prepare();
  for(const [name,value] of Object.entries({'apply.patch.json':p.apply,'rollback.patch.json':p.rollback,'manifest.json':p.metadata}))
    fs.writeFileSync(`${out}/${name}`,JSON.stringify(value,null,2)+'\n');
  fs.writeFileSync(`${out}/calculator.before.js`,p.before);fs.writeFileSync(`${out}/calculator.after.js`,p.after);
  console.log(JSON.stringify(p.metadata,null,2));
}
