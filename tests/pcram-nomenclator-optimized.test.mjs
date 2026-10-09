import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runInNewContext } from "node:vm";
import { queryNomenclator } from "../workflow/pcram-nomenclator-query.mjs";
import { loadPackedNomenclator, queryPackedNomenclator } from "../workflow/pcram-nomenclator-packed.mjs";

const source = new URL("../data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.json", import.meta.url);
const index = JSON.parse(fs.readFileSync(source));
const packed = JSON.parse(fs.readFileSync(new URL(source.href.replace(/\.json$/, ".indexed-v3.json"))));
const prev = JSON.parse(fs.readFileSync(new URL("../docs/evidence/nomenclator-agent-2026-10-08/candidate.workflow.json", import.meta.url)));
const next = JSON.parse(fs.readFileSync(new URL("../docs/evidence/nomenclator-optimization-2026-10-08/candidate.workflow.json", import.meta.url)));
const query = (prefijo = "", texto = "", limite = 6) => ({ indice: 1, prefijo, texto, limite });

test("same exact responses for reference cases, text-only, substrings, accent and broad query", () => {
  const runtime = loadPackedNomenclator(packed);
  for (const q of [query("85176272", "frecuencia"), query("95030060", "plastico"), query("6109", "camisetas"),
    query("99999999999Z"), query("85176272900U", "algodon"), query("", "camisetas"), query("", "plastico construccion"),
    query("", "camis"), query("", "plástico"), query("", "los"), query("8517.62.72.900U"),
    query("95030060", "construccion", 8), query("85176272900"), query("", "aa"), {indice: 1}, null]) {
    assert.deepEqual(queryPackedNomenclator(runtime, q), queryNomenclator(index, q));
  }
});

test("prefix and text indexes limit visited records; checksum errors fail closed", () => {
  const a = loadPackedNomenclator(packed);
  queryPackedNomenclator(a, query("85176272", "frecuencia"));
  assert.ok(a.stats.sim_checked < 100); assert.equal(a.stats.term_index_loaded, false); assert.equal(a.stats.shards_decoded, 1);
  const b = loadPackedNomenclator(packed);
  queryPackedNomenclator(b, query("", "camisetas"));
  assert.ok(b.stats.sim_checked < 1000); assert.equal(b.stats.term_index_loaded, true);
  const broken = { ...packed, catalog: [...packed.catalog] }; broken.catalog[1] ^= 1;
  assert.throws(() => loadPackedNomenclator(broken), /checksum/);
});

test("only tool jsCode changes; no model/prompt/taxes/topology changes; exact candidate recovery", () => {
  assert.equal(next.nodes.length, 12);
  assert.ok(Buffer.byteLength(next.nodes[11].parameters.jsCode) < 3_000_000);
  const restored = structuredClone(next);
  restored.nodes[11].parameters.jsCode = prev.nodes[11].parameters.jsCode;
  assert.deepEqual(restored, prev);
  assert.doesNotMatch(next.nodes[11].parameters.jsCode, /(?:^|\n)\s*(?:import\s|require\s*\()/);
});

test("literal optimized tool executes in isolated local VM with no Buffer/require/network", () => {
  const q = query("95030060", "plastico");
  const result = JSON.parse(runInNewContext(`(function(){${next.nodes[11].parameters.jsCode}})()`, { query: q }, { timeout: 5000 }));
  assert.deepEqual(result, queryNomenclator(index, q));
});
