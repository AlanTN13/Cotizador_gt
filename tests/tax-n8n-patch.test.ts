import {describe,it,expect} from 'vitest';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/n8n-production-before-tax.json',import.meta.url),'utf8'));
const script=new URL('../scripts/patch-n8n-tax-resolver.mjs',import.meta.url).pathname;
describe('guarded offline n8n patch',()=>{
  it('preserves live-only registry nodes, credentials, settings and metadata; repeated patch is idempotent',()=>{
    const dir=mkdtempSync(join(tmpdir(),'gt-tax-patch-'));
    try {
      const live=structuredClone(fixture);
      live.id='live-fixture-id';live.active=true;live.versionId='live-version';
      live.nodes.push({id:'registry-fixture',name:'Registro existente',type:'n8n-nodes-base.googleSheets',parameters:{operation:'append'},credentials:{googleSheetsOAuth2Api:{id:'fixture-existing-credential'}}});
      live.nodes[0].credentials={httpHeaderAuth:{id:'fixture-existing-auth'}};
      live.connections['Cotizador deterministico'].main[0]=[{node:'Registro existente',type:'main',index:0}];
      live.connections['Registro existente']={main:[[{node:'Responder a la landing',type:'main',index:0}]]};
      live.settings={...live.settings,saveExecutionProgress:true};
      const original=join(dir,'original.json'),out=join(dir,'out.json'),again=join(dir,'again.json');
      writeFileSync(original,JSON.stringify(live));
      execFileSync(process.execPath,[script,original,out]);
      const patched=JSON.parse(readFileSync(out,'utf8'));
      const modified=patched.nodes.find((n:{name:string})=>n.name==='Cotizador deterministico');
      expect(modified.parameters.jsCode).toContain('taxResolver');
      modified.parameters.jsCode=live.nodes.find((n:{name:string})=>n.name==='Cotizador deterministico').parameters.jsCode;
      expect(patched).toEqual(live);
      execFileSync(process.execPath,[script,out,again]);
      expect(readFileSync(out,'utf8')).toBe(readFileSync(again,'utf8'));
      expect(JSON.parse(readFileSync(original,'utf8'))).toEqual(live);
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
  it('normalizes only defaults omitted by the actual n8n export',()=>{
    const dir=mkdtempSync(join(tmpdir(),'gt-tax-live-defaults-'));
    try {
      const live=structuredClone(fixture);
      for(const name of ['Validar formulario','Preparar agente','Validar salida del agente','Cotizador deterministico'])
        delete live.nodes.find((n:{name:string})=>n.name===name).parameters.mode;
      delete live.nodes.find((n:{name:string})=>n.name==='OpenAI Chat Model').parameters.responsesApiEnabled;
      delete live.nodes.find((n:{name:string})=>n.name==='Salida estructurada').parameters.autoFix;
      const agent=live.nodes.find((n:{name:string})=>n.name==='Agente Despachante');
      agent.parameters=Object.fromEntries(Object.entries(agent.parameters).reverse());
      live.settings={executionOrder:'v1',binaryMode:'default',availableInMCP:false};
      live.nodes[0].credentials={httpHeaderAuth:{id:'existing-fixture-credential'}};
      const original=join(dir,'original.json'),out=join(dir,'out.json');writeFileSync(original,JSON.stringify(live));
      execFileSync(process.execPath,[script,original,out]);
      const patched=JSON.parse(readFileSync(out,'utf8'));
      const calculator=patched.nodes.find((n:{name:string})=>n.name==='Cotizador deterministico');
      calculator.parameters.jsCode=live.nodes.find((n:{name:string})=>n.name==='Cotizador deterministico').parameters.jsCode;
      expect(patched).toEqual(live);
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
  it.each(['Cotizador deterministico','Agente Despachante','Validar salida del agente'])('refuses unreviewed live drift at %s',name=>{
    const dir=mkdtempSync(join(tmpdir(),'gt-tax-drift-'));
    try {
      const live=structuredClone(fixture),node=live.nodes.find((n:{name:string})=>n.name===name);
      if(name==='Agente Despachante') node.parameters.options.systemMessage+=' changed contract';
      else node.parameters.jsCode+='\n// changed live code';
      const original=join(dir,'original.json'),out=join(dir,'out.json');writeFileSync(original,JSON.stringify(live));
      const res=spawnSync(process.execPath,[script,original,out],{encoding:'utf8'});
      expect(res.status).not.toBe(0);expect(res.stderr).toContain('reconcile');
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
});
