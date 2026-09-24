import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import Decimal from 'decimal.js';
import {calculate,validateInput,parseAgent,agentInstructions,agentSchema} from '../workflow/workflow-source.mjs';
import {agentInstructions as previousInstructions,agentSchema as previousSchema} from './fixtures/n8n-production-before-tax.mjs';
import {resolveProductTaxes} from '../workflow/tax-adapter.mjs';
import * as resolver from '../lib/courier/tax-resolver';
import policy from '../data/tax-estimation-policy.json';
import {courierResponseSchema} from '../lib/courier/n8n-contract';
const now=new Date('2026-09-22T23:00:00Z');
const product=(position:string|null,DIE=20,producto='Producto identificado',indice=1)=>({indice,producto,SIM:position,clasificacion:null as string|null,DIE,evidencia:[],fundamento:'Estimación del agente de prueba'});
const input=(products:ReturnType<typeof product>[],overrides={})=>({solicitud:{solicitud_id:'tax-test',productos:products.map(p=>({link:'',descripcion:p.producto})),fob_usd:1000,cantidad:100,bultos:[{cantidad:1,peso_kg:12,largo_cm:50,ancho_cm:40,alto_cm:40}],...overrides},productos:products});
const exported=JSON.parse(readFileSync(new URL('../workflow/GlobalTrip-Courier-V1.n8n.json',import.meta.url),'utf8'));
const baseline=JSON.parse(readFileSync(new URL('./fixtures/n8n-production-before-tax.json',import.meta.url),'utf8'));
const sha=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const FixedDate=class extends Date { constructor(value?: string | number) { super(value ?? now.getTime()); } static now() { return now.getTime(); } };
function execute(s:unknown){
  const code=exported.nodes.find((n:{name:string})=>n.name==='Cotizador deterministico').parameters.jsCode;
  return runInNewContext(`(function(){${code}})()`,{$input:{first:()=>({json:s})},Date:FixedDate}, {timeout:3000})[0].json.respuesta;
}
describe('Tax Resolver adapted to production n8n',()=>{
  const cases=[
    ['ventilador','84145190100R',.20,.03,.21,'RESUELTO'],
    ['remera','61091000190Z',.20,.03,.21,'RESUELTO'],
    ['cuchara','82159910130F',.18,.03,.21,'RESUELTO'],
    ['LED','85395200900Z',.20,.03,.21,'RESUELTO'],
    ['taza','69120000191F',.20,.03,.21,'RESUELTO'],
    ['notebook','84713012991G',.16,0,.105,'RESUELTO'],
    ['router','85176241100N',0,0,.105,'RESUELTO'],
    ['smartphone','85171300000C',.08,0,.21,'ESTIMADO'],
    ['repuesto identificado sin NCM',null,.14,.03,.21,'ESTIMADO'],
  ] as const;
  it.each(cases)('%s resolves each rate and trace in the actual exported node',(name,position,duty,statistical,vat,status)=>{
    const s=input([product(position,14,name)]);
    const result=execute(s);
    expect(result.status).toBe('cotizado');
    expect(result.auditoria.taxResolutions[0]).toMatchObject({status,rates:{duty,statistical,vat},resolverVersion:resolver.TAX_RESOLVER_VERSION});
    expect(result.auditoria.taxResolutions[0].agentEvidence.DIE).toBe(14);
    expect(result).toEqual(calculate(s,now).respuesta);
  });
  it('ambiguous NCM returns REQUIERE_REVISION with no fabricated price and existing UI contract',()=>{
    const result=execute(input([product('21069090')]));
    expect(result).toMatchObject({status:'error',codigo:'REQUIERE_REVISION'});
    expect(result).not.toHaveProperty('total_usd');
    expect(result.auditoria.taxResolutions[0].reasons).toContain('DIE_TE_AMBIGUOUS_OR_INVALID');
    expect(courierResponseSchema.parse(result)).toMatchObject({status:'error',codigo:'REQUIERE_REVISION'});
  });
  it.each([
    {...product('85176241100N'),clasificacion:'84713012'},
    {...product('85176241100N'),clasificacion:'8471.30'},
    {...product(null),producto:'No identificado'},
    {...product('85176241100N'),impedimento_courier:true},
  ])('reserves review for material contradiction, no identification or explicit impediment',p=>{
    expect(calculate(input([p]),now).respuesta).toMatchObject({status:'error',codigo:'REQUIERE_REVISION'});
  });
  it('specific zero and reduced rates override a higher model estimate',()=>{
    const t=resolveProductTaxes(product('85176241100N',35),0,now,resolver,policy);
    expect(t.rates).toEqual({duty:0,statistical:0,vat:.105});
    expect(t.agentEvidence.DIE).toBe(35);
    expect(t.dutyEvidence?.source.sha256).toHaveLength(64);
    expect(t.vatEvidence?.rules[0].sourceIds.length).toBeGreaterThan(0);
  });
  it('uses a known homogeneous NCM when only a plausible SIM suffix is unverified',()=>{
    const t=resolveProductTaxes(product('85176241999Z'),0,now,resolver,policy);
    expect(t.rates).toEqual({duty:0,statistical:0,vat:.105});
    expect(t.warnings).toContain('SIM_UNVERIFIED_NCM_ESTIMATE');
  });
  it('records same-position model fallback truthfully as agent estimate, never an approved profile',()=>{
    const t=resolveProductTaxes(product('99999999',7),0,now,resolver,policy);
    expect(t).toMatchObject({status:'ESTIMADO',rates:{duty:.07,statistical:.03,vat:.21}});
    expect(t.estimation.components.find((c:{tax:string})=>c.tax==='duty')?.method).toBe('AGENT_ESTIMATE');
    expect(t.warnings).toContain('AGENT_DUTY_ESTIMATE');
  });
  it('maintenance deadline warns, while general TE legal expiry blocks fallback',()=>{
    expect(resolveProductTaxes(product('85176241100N'),0,new Date('2027-01-01'),resolver,policy).rates.vat).toBe(.105);
    expect(resolveProductTaxes(product(null),0,new Date('2028-01-01'),resolver,policy).status).toBe('REQUIERE_REVISION');
  });
  it('a mixed shipment computes VAT per product instead of multiplying average rates',()=>{
    const s=input([product('84145190100R',20,'fan',1),product('85176241100N',0,'router',2)]);
    const r=calculate(s,now).respuesta;
    if (!("auditoria" in r) || !("total_usd" in r)) throw new Error("Expected quotation");
    const cif=new Decimal('1033.6').times('1.01'), half=cif.div(2);
    const duty=half.times('.2'), te=half.times('.03');
    const vat=half.plus(duty).plus(te).times('.21').plus(half.times('.105'));
    const taxes=duty.plus(te).plus(vat).times('1.012');
    const money=(x:Decimal)=>x.toDecimalPlaces(2,Decimal.ROUND_HALF_UP).toNumber();
    expect(r.auditoria.iva_usd).toBe(money(vat));
    expect(r.impuestos_y_tasas_usd).toBe(money(taxes));
    expect(r.total_usd).toBe(money(taxes.plus('384').plus('90.75')));
    expect(r.auditoria.tributos_por_producto).toHaveLength(2);
    expect(r.auditoria.asignacion_cif).toBe('PARTES_IGUALES_POR_PRODUCTO_FOB_TOTAL_SIN_DESGLOSE');
    expect(money(cif.plus(duty).plus(te).times('.1575'))).not.toBe(r.auditoria.iva_usd);
  });
  it('matches the China worksheet reference case and formulas',()=>{
    const s=input([product(null,20,'Producto con DIE 20%, TE 3% e IVA 21%')],{
      fob_usd:500,
      bultos:[
        {cantidad:1,peso_kg:10,largo_cm:40,ancho_cm:20,alto_cm:30},
        {cantidad:2,peso_kg:5,largo_cm:50,ancho_cm:30,alto_cm:40},
      ],
    });
    const r=calculate(s,now).respuesta;
    if (!("auditoria" in r) || !("total_usd" in r)) throw new Error("Expected quotation");
    expect(r.peso_considerado_kg).toBe(29);
    expect(r.flete_internacional_usd).toBe(580);
    expect(r.handling_con_iva_usd).toBe(90.75);
    expect(r.auditoria).toMatchObject({
      peso_real_total_kg:20,
      peso_volumetrico_total_kg:28.8,
      tarifa_usd_kg:20,
      cif_usd:566.51,
      derechos_usd:113.3,
      tasa_estadistica_usd:17,
      iva_usd:146.33,
      debitos_creditos_usd:3.32,
    });
    expect(r.impuestos_y_tasas_usd).toBe(279.95);
    expect(r.total_usd).toBe(950.7);
  });
  it.each([
    [20,1,1,1,20,24],
    [20.01,1,1,1,20.5,20],
    [1,100.05,50,20,20.5,20],
    [30.01,1,1,1,30.5,19],
  ])('rounds gross and volumetric weights up to 0.5 kg before applying freight tiers',
    (gross,length,width,height,expectedWeight,expectedRate)=>{
      const s=input([product('85176241100N')],{bultos:[{cantidad:1,peso_kg:gross,largo_cm:length,ancho_cm:width,alto_cm:height}]});
      const r=calculate(s,now).respuesta;
      if (!("auditoria" in r) || !("total_usd" in r)) throw new Error("Expected quotation");
      expect(r.peso_considerado_kg).toBe(expectedWeight);
      expect(r.auditoria.tarifa_usd_kg).toBe(expectedRate);
      expect(r.flete_internacional_usd).toBe(expectedWeight*expectedRate);
    });
  it('ten products retain their individual resolution and input order through the existing parser',()=>{
    const products=Array.from({length:10},(_,i)=>product(i%2?'85176241100N':'84145190100R',20,'Identificado',i+1));
    const s=input(products);
    const validated=validateInput(s.solicitud,'test');
    const parsed=parseAgent({output:{productos:[...products].reverse()}},validated);
    const result=execute(parsed);
    expect(result.auditoria.taxResolutions.map((t:{productIndex:number})=>t.productIndex)).toEqual([...Array(10).keys()]);
    expect(result.auditoria.taxResolutions.map((t:{rates:{vat:number}})=>t.rates.vat)).toEqual(products.map((_,i)=>i%2?.105:.21));
  });
  it('changes only calculator code in the exported workflow; agent, credentials and topology unchanged',()=>{
    const candidate=structuredClone(exported);
    candidate.nodes.find((n:{name:string})=>n.name==='Cotizador deterministico').parameters.jsCode=
      baseline.nodes.find((n:{name:string})=>n.name==='Cotizador deterministico').parameters.jsCode;
    expect(sha(JSON.stringify(candidate))).toBe(sha(JSON.stringify(baseline)));
    expect(agentInstructions).toBe(previousInstructions);
    expect(agentSchema).toEqual(previousSchema);
  });
  it('keeps tracing internal using the unchanged gateway response contract',()=>{
    const full=calculate(input([product('85176241100N')]),now).respuesta;
    const out=courierResponseSchema.parse(full);
    expect(out).not.toHaveProperty('auditoria');
    expect(out.status).toBe('cotizado');
    expect(out.mensaje).toContain('simulación');
  });
  it('pins original source documents and row count for the embedded snapshot',()=>{
    const d=resolver.taxDataset;
    expect(Object.keys(d.duty.rows)).toHaveLength(32978);
    expect(sha(readFileSync(new URL('../data/tax-sources/ncmsim.pdf',import.meta.url)))).toBe(d.duty.source.sha256);
    const vat=JSON.parse(readFileSync(new URL('../data/tax-vat.json',import.meta.url),'utf8'));
    const annex=vat.sources.find((s:{document?:string})=>s.document);
    expect(sha(readFileSync(new URL('../'+annex.document,import.meta.url)))).toBe(annex.sha256);
  });
});
