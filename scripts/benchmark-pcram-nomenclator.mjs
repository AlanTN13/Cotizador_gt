// Local-only measurements of literal previous/current Code Tool bodies. No n8n/API calls.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Script, createContext } from "node:vm";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "docs/evidence/nomenclator-optimization-2026-10-08");
const samples = 30, repeats = 3;
const make = (prefijo, texto = "", limite = 6) => ({ indice: 1, prefijo, texto, limite });
const cases = [
  ["VALDUS-family", make("85176272", "frecuencia")],
  ["Chengji-family", make("95030060", "plastico")],
  ["shirt-incomplete", make("6109", "camisetas")],
  ["nonexistent", make("99999999999Z")],
  ["contradictory", make("85176272900U", "algodon")],
  ["text-only-shirt", make("", "camisetas")],
  ["exact-SIM", make("85176272900U")],
  ["broad-text", make("", "los")],
];
const peak = () => process.resourceUsage().maxRSS / 1024;
const sha = text => createHash("sha256").update(text).digest("hex");
if (process.argv[2] === "--worker") {
  const variant = process.argv[3], file = process.argv[4], q = JSON.parse(process.argv[5]);
  global.gc?.();
  const baseRss = process.memoryUsage().rss / 1048576;
  let code = fs.readFileSync(file, "utf8");
  // Benchmark-only return hook: all data/decoder/query code remain literal and unchanged.
  const previousReturn = "return JSON.stringify(queryNomenclator(index, query));\n";
  const optimizedReturn = "return JSON.stringify(queryPackedNomenclator(runtime, query));\n";
  const anchor = variant === "previous" ? previousReturn : optimizedReturn;
  if (!code.endsWith(anchor)) throw new Error("Tool return anchor mismatch");
  code = code.slice(0, -anchor.length) + (variant === "previous"
    ? "return {search: q => JSON.stringify(queryNomenclator(index,q)), stats: () => null};"
    : "return {search: q => JSON.stringify(queryPackedNomenclator(runtime,q)), stats: () => ({...runtime.stats})};");
  const t0 = performance.now();
  const script = new Script(`(function(){${code}})()`);
  const t1 = performance.now();
  const api = script.runInContext(createContext({}), { timeout: 15000 });
  const t2 = performance.now();
  const initPeak = peak();
  const result = api.search(q);
  const t3 = performance.now();
  const firstStats = api.stats();
  const timings = [];
  for (let i = 0; i < samples; i++) { const start = performance.now(); api.search(q); timings.push(performance.now() - start); }
  process.stdout.write(JSON.stringify({
    compile_ms: t1-t0, load_ms: t2-t1, initialization_ms: t2-t0, first_query_ms: t3-t2,
    cold_total_ms: t3-t0, base_rss_mib: baseRss, peak_init_rss_mib: initPeak, peak_rss_mib: peak(),
    heap_used_mib: process.memoryUsage().heapUsed / 1048576,
    query_samples_ms: timings, first_query_stats: firstStats, response_sha256: sha(result),
    matched_count: JSON.parse(result).matched_count, returned_count: JSON.parse(result).returned_count,
  }));
  process.exit(0);
}

const old = JSON.parse(fs.readFileSync(path.join(root, "docs/evidence/nomenclator-agent-2026-10-08/candidate.workflow.json")));
const current = JSON.parse(fs.readFileSync(path.join(out, "candidate.workflow.json")));
const sources = { previous: old.nodes[11].parameters.jsCode, optimized: current.nodes[11].parameters.jsCode };
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "globaltrip-nomenclator-bench-"));
const percentile = (numbers, p) => [...numbers].sort((a,b)=>a-b)[Math.ceil(numbers.length*p)-1];
const summary = numbers => ({ p50: percentile(numbers, .5), p95: percentile(numbers, .95), min: Math.min(...numbers), max: Math.max(...numbers) });
const report = {
  status: "LOCAL_ONLY", timestamp: new Date().toISOString(),
  environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0].model, cpus: os.cpus().length },
  protocol: { fresh_processes_per_variant_per_case: repeats, warm_queries_per_process: samples,
    child_heap_limit_mib: 128, maxRSS_unit: "MiB; OS process high-water mark including Node/V8, code, initialization and query loops",
    initialization: "compile literal tool + load data/decoder/prefix catalog; excludes filesystem read",
    first_query: "lookup + output serialization, includes lazy term/shard decoding",
    cold_total: "initialization + first query; no cross-call cache assumed",
    warm: "same initialized local VM; informational, not a guarantee of n8n reuse",
    comparison: "exact full serialized response SHA-256 per case; no model outputs" },
  sizes: Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,{tool_bytes:Buffer.byteLength(v)}])),
  production_changes: 0, n8n_cloud_runs: 0, openai_calls: 0, cases: [],
};
try {
  for (const [variant, source] of Object.entries(sources)) fs.writeFileSync(path.join(temp, variant+".js"), source);
  for (const [name, q] of cases) {
    const entry = { name, query: q };
    for (const variant of Object.keys(sources)) {
      const runs = [];
      for (let i=0;i<repeats;i++) {
        const result = spawnSync(process.execPath, ["--expose-gc", "--max-old-space-size=128", fileURLToPath(import.meta.url), "--worker", variant, path.join(temp,variant+".js"),JSON.stringify(q)], { encoding:"utf8", timeout:60000, maxBuffer:1000000 });
        if (result.status !== 0) throw new Error(`Benchmark ${variant}/${name} failed: ${result.stderr}`);
        runs.push(JSON.parse(result.stdout));
      }
      entry[variant] = {
        initialization_ms: summary(runs.map(r=>r.initialization_ms)), first_query_ms: summary(runs.map(r=>r.first_query_ms)),
        cold_total_ms: summary(runs.map(r=>r.cold_total_ms)), warm_query_ms: summary(runs.flatMap(r=>r.query_samples_ms)),
        peak_rss_mib: Math.max(...runs.map(r=>r.peak_rss_mib)),
        peak_init_rss_mib: Math.max(...runs.map(r=>r.peak_init_rss_mib)),
        runs,
      };
    }
    entry.responses_exact = entry.previous.runs.every(r=>r.response_sha256===entry.optimized.runs[0].response_sha256);
    if (!entry.responses_exact) throw new Error("Response changed: "+name);
    report.cases.push(entry);
    console.log(JSON.stringify({case:name, old_cold_p50:entry.previous.cold_total_ms.p50,new_cold_p50:entry.optimized.cold_total_ms.p50,exact:true}));
  }
  fs.writeFileSync(path.join(out,"benchmark.json"),JSON.stringify(report,null,2)+"\n");
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
