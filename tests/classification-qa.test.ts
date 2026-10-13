import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe,it,expect,vi} from "vitest";
import {readFileSync} from "node:fs";
import {buildCalculationDetail} from "../lib/courier/calculation-detail";
import {courierUpstreamResponseSchema,courierResponseSchema,courierDebugResponseSchema,courierRequestSchema} from "../lib/courier/n8n-contract";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import {runInNewContext} from "node:vm";
// Existing Next tsconfig preserves JSX; compile this component in-memory for
// the focalized render test without changing project/test configuration.
const compiled=ts.transpileModule(readFileSync(new URL("../app/cotizador/calculation-breakdown.tsx",import.meta.url),"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
const componentExports: {default?: React.ComponentType<{detail:ReturnType<typeof buildCalculationDetail>}>}={};
runInNewContext(compiled,{exports:componentExports,require:(name:string)=>name==="react/jsx-runtime"?jsxRuntime:{default:{}}});
const CalculationBreakdown=componentExports.default!;
const trace=JSON.parse(readFileSync(new URL("../docs/evidence/pcram-user-qa-34575-2026-10-13/selected-trace.json",import.meta.url),"utf8"));
const raw={solicitud_id:trace.input.solicitud_id,status:"cotizado",mensaje:"Fixture de QA",...trace.commercial_result,
 auditoria:{productos:[{...trace.validator_output.producto}],taxResolutions:[trace.tax_resolution],tributos_por_producto:[{indice:1,cif_usd:528.43,derechos_usd:105.69,tasa_estadistica_usd:15.85,iva_usd:136.49}],peso_real_total_kg:20,peso_volumetrico_total_kg:28.8,tarifa_usd_kg:20,cif_usd:528.43,derechos_usd:105.69,tasa_estadistica_usd:15.85,iva_usd:136.49,debitos_creditos_usd:3.1}};
raw.auditoria.taxResolutions[0]={...raw.auditoria.taxResolutions[0],agentEvidence:{producto:"Camiseta de runnig"},estimation:{components:[{tax:"duty",method:"AGENT_ESTIMATE",source:"n8n-agent-contract-2026-09-15:product-1",basis:"Estimación individual"}]}};
const qa={nivel:"COINCIDENCIA_APROXIMADA",candidato:"61099000",codigo_validado:"6109",motivo:"Falta composición",source_sha256:trace.source.zip_sha256,verificador:"literal-product-evidence-v1"};
const request=courierRequestSchema.parse(trace.input);
function detail(data=raw){const response=courierUpstreamResponseSchema.parse(data);if(response.status!=="cotizado")throw Error("Expected quote");return buildCalculationDetail(request,response);}
describe("classification QA without changing commercial behavior",()=>{
 it("legacy response remains approximate; matching amount does not manufacture exact or PCRAM evidence",()=>{
  const d=detail();expect(d.productos[0].coincidencia).toBe("Coincidencia aproximada");expect(d.productos[0].origen_die).toBe("AGENT_ESTIMATE");
  expect(d.productos[0].ncm_sim).toBe("No informado");expect(d.totales.at(-1)?.importe).toBe("USD 931,88");
 });
 it("partial family, candidate and tax method are independent and allowlisted only in QA",()=>{
  const data=structuredClone(raw);Object.assign(data.auditoria.productos[0],{clasificacion:"6109",clasificacion_qa:qa});
  data.auditoria.taxResolutions[0].estimation.components[0].method="FAMILY_SNAPSHOT";
  const d=detail(data);expect(d.productos[0]).toMatchObject({coincidencia:"Coincidencia aproximada",ncm_sim:"6109",codigo_candidato:"61099000",codigo_validado:"6109",origen_die:"FAMILY_SNAPSHOT"});
  expect(courierResponseSchema.parse(data)).toEqual(courierResponseSchema.parse(raw));
  expect(JSON.stringify(courierResponseSchema.parse(data))).not.toMatch(/coincidencia|clasificacion_qa|auditoria|FAMILY_SNAPSHOT/);
  expect(courierDebugResponseSchema.parse({...courierResponseSchema.parse(data),detalle_calculo:d}).status).toBe("cotizado");
 });
 it("exact classification requires matching validated code, never depends on low tax rate",()=>{
  const data=structuredClone(raw);Object.assign(data.auditoria.productos[0],{clasificacion:"61091000",clasificacion_qa:{...qa,nivel:"COINCIDENCIA_EXACTA",codigo_validado:"61091000",motivo:""}});
  data.auditoria.taxResolutions[0].ncm="61091000";
  expect(detail(data).productos[0].coincidencia).toBe("Coincidencia exacta");
  expect(detail(data).productos[0].origen_die).toBe("AGENT_ESTIMATE");
  data.auditoria.taxResolutions[0].ncm="95030060";
  expect(detail(data).productos[0].coincidencia).toBe("Coincidencia aproximada");
 });
 it("renders verdict, fallback and origin in existing QA component without formula duplication",()=>{
  vi.stubGlobal("React",React);
  try{const html=renderToStaticMarkup(React.createElement(CalculationBreakdown,{detail:detail()}));
   expect(html).toContain("Coincidencia aproximada");expect(html).toContain("Origen del DIE");expect(html).toContain("AGENT_ESTIMATE");expect(html).toContain("931,88");
  }finally{vi.unstubAllGlobals();}
 });
});
