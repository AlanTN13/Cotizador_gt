import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { queryNomenclator } from "../workflow/pcram-nomenclator-query.mjs";
import { guardClassification } from "../workflow/pcram-classification-guard.mjs";

const dir = new URL("../docs/evidence/nomenclator-agent-2026-10-08/", import.meta.url);
const load = file => fs.readFileSync(new URL(file, dir), "utf8");
const before = JSON.parse(load("baseline.workflow.json")), candidate = JSON.parse(load("candidate.workflow.json"));
const receipt = JSON.parse(load("candidate.receipt.json"));
const index = JSON.parse(fs.readFileSync(new URL("../" + receipt.index_file, import.meta.url)));
const sha = index.metadata.zip_sha256;
const find = (w, name) => w.nodes.find(n => n.name === name);
const lookup = (prefijo, texto = "", limite = 6, indice = 1) => queryNomenclator(index, { indice, prefijo, texto, limite });
const step = result => ({ action: { tool: "Consulta_nomenclador_PCRAM", toolInput: result.query }, observation: JSON.stringify(result) });
const product = (clasificacion, SIM = null, DIE = 35) => ({ indice: 1, producto: "Fixture: not real agent output", clasificacion, SIM, DIE, evidencia: [], fundamento: "Synthetic contract fixture" });

test("prefix + lexical text: real candidates, context, dates, no taxes", () => {
  const toy = lookup("95030060", "plastico", 2);
  assert.ok(toy.results.length > 0); assert.equal(toy.returned_count, 2); assert.equal(toy.partial, true);
  assert.ok(toy.results.every(r => r.ncm === "95030060" && /construcción/.test(r.ncm_context)));
  assert.ok(toy.results.every(r => r.source_uri.includes(sha)));
  assert.ok(lookup("85176272", "frecuencia").results.length > 0);
  assert.equal(lookup("99999999999Z").status, "NO_MATCH");
  assert.equal(lookup("6109", "camisetas").partial, true);
  assert.equal(lookup("", "camisetas").status, "OK");
  assert.equal(lookup("8517.62.72.900U").results[0].sim, "85176272900U");
  assert.equal(lookup("85176272900U", "algodon").status, "NO_MATCH");
  assert.equal(toy.source.purpose, "CLASSIFICATION_ONLY; no rates; no legal notes");
  assert.ok(toy.results.every(r => r.description_limits.completeness_not_guaranteed));
});

test("query bounds and invalid codes fail closed, without truncating or padding", () => {
  for (const query of [{indice:1,prefijo:"85176272900"}, {indice:1,prefijo:"85176272900UU"}, {indice:1,prefijo:" 6109"},
    {indice:1,prefijo:"6109",limite:9}, {indice:1,texto:"a"}, {indice:1}, {indice:1,texto:"x".repeat(161)}, {indice:1,prefijo:"6109",rates:true}]) {
    assert.equal(queryNomenclator(index, query).status, "INVALID_QUERY");
  }
});

test("snapshot data are immutable and lookup repeatable", () => {
  const hash = createHash("sha256").update(JSON.stringify(index)).digest("hex");
  assert.deepEqual(lookup("95030060", "plastico"), lookup("95030060", "plastico"));
  assert.equal(createHash("sha256").update(JSON.stringify(index)).digest("hex"), hash);
});

test("membership guard uses actual observations per product, not claimed citations", () => {
  const r = lookup("85176272900U"); const p = product("85176272", r.results[0].sim);
  assert.deepEqual(guardClassification([p], [step(r)], sha), [p]);
  const rejected = guardClassification([p], [], sha)[0];
  assert.equal(rejected.SIM, null); assert.equal(rejected.clasificacion, null); assert.equal(rejected.DIE, 35);
  const other = lookup("85176272900U", "", 6, 2);
  assert.equal(guardClassification([p], [step(other)], sha)[0].SIM, null);
  assert.equal(guardClassification([product("99999999", "99999999999Z")], [step(r)], sha)[0].SIM, null);
  const bad = step(r); bad.action.toolInput = { ...r.query, indice: 2 };
  assert.equal(guardClassification([p], [bad], sha)[0].SIM, null);
});

test("partial classification and estimated DIE unchanged; inconsistent positions not repaired", () => {
  assert.deepEqual(guardClassification([product("6109", null, 20)], [], sha), [product("6109", null, 20)]);
  const watch = lookup("85176272900U"); const toy = lookup("95030060");
  const p = guardClassification([product("95030060", "85176272900U")], [step(watch), step(toy)], sha)[0];
  assert.equal(p.SIM, null); assert.equal(p.clasificacion, null); assert.equal(p.DIE, 35);
  assert.equal(guardClassification([product("85176272900", "85176272900")], [step(watch)], sha)[0].SIM, null);
});

test("12 nodes; exactly one read-only tool edge, unchanged model/calc/main surfaces; scoped rollback", () => {
  assert.equal(candidate.nodes.length, 12);
  assert.deepEqual(find(candidate, "OpenAI Chat Model"), find(before, "OpenAI Chat Model"));
  assert.equal(find(candidate, "Cotizador deterministico").parameters.jsCode, find(before, "Cotizador deterministico").parameters.jsCode);
  assert.deepEqual(candidate.connections.Consulta_nomenclador_PCRAM, { ai_tool: [[{ node: "Agente Despachante", type: "ai_tool", index: 0 }]] });
  const tool = find(candidate, "Consulta_nomenclador_PCRAM");
  assert.equal(tool.typeVersion, 1.3); assert.equal(tool.parameters.specifyInputSchema, true);
  assert.equal(tool.credentials, undefined); assert.doesNotMatch(tool.parameters.jsCode, /\bfetch\s*\(|\brequire\s*\(|https?:\/\/.*exec/);
  const rolled = structuredClone(candidate);
  rolled.nodes = rolled.nodes.filter(n => n.name !== "Consulta_nomenclador_PCRAM");
  delete rolled.connections.Consulta_nomenclador_PCRAM;
  find(rolled, "Agente Despachante").parameters.options = structuredClone(find(before, "Agente Despachante").parameters.options);
  find(rolled, "Validar salida del agente").parameters.jsCode = find(before, "Validar salida del agente").parameters.jsCode;
  assert.deepEqual(rolled, before);
});

test("execute literal embedded Code Tool and validator offline (not n8n/model behavior)", () => {
  const query = { indice: 1, prefijo: "95030060", texto: "plastico", limite: 2 };
  const tool = find(candidate, "Consulta_nomenclador_PCRAM");
  const result = JSON.parse(runInNewContext(`(function(){${tool.parameters.jsCode}})()`, { query }, { timeout: 5000 }));
  assert.deepEqual(result, queryNomenclator(index, query));
  const solicitud = { productos: [{ descripcion: "juguete", link: "" }], solicitud_id: "offline-tool-test" };
  const raw = { output: { productos: [product("95030060")] }, intermediateSteps: [step(result)] };
  const code = find(candidate, "Validar salida del agente").parameters.jsCode;
  const run = JSON.parse(JSON.stringify(runInNewContext(`(function(){${code}})()`, { $input: { first: () => ({ json: raw }) }, $: () => ({ first: () => ({ json: { solicitud } }) }) }, { timeout: 5000 })));
  assert.equal(run[0].json.productos[0].clasificacion, "95030060"); assert.equal(run[0].json.siguiente, "cotizar");
});

test("frozen resolver contract: position returned by tool -> PCRAM + current IVA; no claim of VALDUS classification", () => {
  const code = find(candidate, "Cotizador deterministico").parameters.jsCode;
  const resolve = p => {
    const solicitud = { solicitud_id: "offline-source-control", productos: [{ descripcion: p.producto, link: "" }], fob_usd: 500, cantidad: 1,
      bultos: [{ cantidad: 1, peso_kg: 29, largo_cm: 1, ancho_cm: 1, alto_cm: 1 }] };
    return JSON.parse(JSON.stringify(runInNewContext(`(function(){${code}})()`, { $input: { first: () => ({ json: { solicitud, productos: [p] } }) } }, { timeout: 5000 })[0].json.respuesta));
  };
  const watch = lookup("85176272900U"); assert.equal(watch.results.length, 1);
  const w = resolve(product(watch.results[0].ncm, watch.results[0].sim));
  assert.deepEqual(w.auditoria.taxResolutions[0].rates, { duty: 0, statistical: 0, vat: .105 });
  assert.equal(w.auditoria.taxResolutions[0].dutyEvidence.source.id, "pcram-transfer");
  assert.equal(w.auditoria.taxResolutions[0].vatEvidence.rules[0].position, watch.results[0].sim);
  const toy = lookup("95030060"); const t = resolve(product(toy.results[0].ncm));
  assert.deepEqual(t.auditoria.taxResolutions[0].rates, { duty: .2, statistical: .03, vat: .21 });
  assert.equal(t.auditoria.taxResolutions[0].dutyEvidence.source.id, "pcram-transfer");
  const partial = resolve(product("6109", null, 20)); assert.equal(partial.auditoria.taxResolutions[0].status, "ESTIMADO");
  assert.equal(partial.auditoria.taxResolutions[0].dutyEvidence, null);
  assert.equal(partial.total_usd, 931.88); assert.equal(partial.flete_internacional_usd, 580); assert.equal(partial.handling_con_iva_usd, 90.75);
});
