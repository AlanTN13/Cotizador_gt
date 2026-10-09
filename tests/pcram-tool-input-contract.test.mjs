import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { z } from "zod";
import { pcramSearchInput } from "../workflow/pcram-tool-input.mjs";
import { guardClassification } from "../workflow/pcram-classification-guard.mjs";

const root = new URL("../", import.meta.url);
const dir = new URL("docs/evidence/pcram-contract-closure-2026-10-09/", root);
const load = file => JSON.parse(fs.readFileSync(new URL(file, root)));
const before = load("docs/evidence/nomenclator-existing-workflow-prepared-2026-10-09/publication-api-verified/published.api-export.json");
const candidate = JSON.parse(fs.readFileSync(new URL("candidate.workflow.json", dir)));
const patch = JSON.parse(fs.readFileSync(new URL("patch.json", dir)));
const rollback = JSON.parse(fs.readFileSync(new URL("rollback.patch.json", dir)));
const diagnosis = load("docs/evidence/pcram-diagnosis-34366/receipt.json");
const find = w => w.nodes.find(n => n.name === "Consulta_nomenclador_PCRAM");
const original = find(before), tool = find(candidate);
const schemaBefore = JSON.parse(original.parameters.inputSchema), schemaAfter = JSON.parse(tool.parameters.inputSchema);
const realQuery = diagnosis.tool.real_calls[0].action.toolInput;
// Exact observed query/extra key names; context values are representative, not a Cloud replay.
const context = { solicitud: { productos: [] }, siguiente: "cotizar", agent_input: JSON.stringify(diagnosis.input.agent_input), toolCallId: diagnosis.tool.real_calls[0].action.toolCallId };
const envelope = { ...context, ...realQuery };
const output = { environment: "LOCAL_ONLY_NO_N8N_NO_MODEL", schema_validation: "Representative Zod 3 object conversion; existing installed zod, no n8n or LangChain package installed", context_values: "Representative; exact extra key names and business query from #34366", controls: {} };
const save = (name, value) => fs.writeFileSync(new URL(name, dir), JSON.stringify(value, null, 2) + "\n");
const hash = text => createHash("sha256").update(text).digest("hex");

// Same primitive/object operations as official json-schema-to-zod parse-object:
// false => strict(); true => catchall(z.any()). Four unchanged property constraints.
function schemaValidator(schema) {
  const properties = Object.fromEntries(Object.entries(schema.properties).map(([key, rule]) => {
    let validator = rule.type === "integer" ? z.number().int().min(rule.minimum).max(rule.maximum) : z.string().max(rule.maxLength);
    if (!schema.required.includes(key)) validator = validator.optional();
    return [key, validator];
  }));
  const object = z.object(properties);
  return schema.additionalProperties === false ? object.strict() : object.catchall(z.any());
}
const run = (t, q, capture = false) => {
  const code = capture ? t.parameters.jsCode.replace("return JSON.stringify(queryPackedNomenclator(runtime, pcramSearchInput(query)));", "return JSON.stringify({ forwarded: pcramSearchInput(query), result: queryPackedNomenclator(runtime, pcramSearchInput(query)) });") : t.parameters.jsCode;
  return runInNewContext(`(function(){${code}})()`, { query: q }, { timeout: 5000 });
};
const invoke = q => run(tool, schemaValidator(schemaAfter).parse(q));
const step = (q, observation) => ({ action: { tool: tool.name, toolInput: q }, observation });
const sourceSha = diagnosis.tool.configured_index_metadata.zip_sha256;
const query = { indice: 1, prefijo: "85176272900U", texto: "", limite: 5 };
const product = { indice: 1, producto: "Contract fixture, not a classified VALDUS", clasificacion: "85176272", SIM: "85176272900U", DIE: 16, evidencia: [], fundamento: "Synthetic membership fixture; no model call" };
const literalValidator = (products, steps) => {
  const code = candidate.nodes.find(n => n.name === "Validar salida del agente").parameters.jsCode;
  const raw = { output: { productos: products }, intermediateSteps: steps };
  const solicitud = { productos: products.map(p => ({ descripcion: p.producto, link: "" })), solicitud_id: "local-contract-only" };
  return JSON.parse(JSON.stringify(runInNewContext(`(function(){${code}})()`, {
    $input: { first: () => ({ json: raw }) }, $: () => ({ first: () => ({ json: { solicitud } }) }),
  }, { timeout: 5000 })))[0].json;
};

test("reproduces #34366 strict-schema rejection of four observed context keys", () => {
  const result = schemaValidator(schemaBefore).safeParse(envelope);
  assert.equal(result.success, false);
  const issue = result.error.issues.find(i => i.code === "unrecognized_keys");
  assert.deepEqual(issue.keys, diagnosis.tool.unexpected_runtime_keys);
  output.controls.reproduction = { exact_business_query: realQuery, rejected_keys: issue.keys, error: issue.message };
});

test("permissive schema alone still fails the unchanged search; adapter forwards only four keys", () => {
  const accepted = schemaValidator(schemaAfter).parse(envelope);
  assert.equal(JSON.parse(run(original, accepted)).status, "INVALID_QUERY");
  const captured = JSON.parse(run(tool, accepted, true));
  assert.deepEqual(Object.keys(captured.forwarded), ["indice", "prefijo", "texto", "limite"]);
  assert.deepEqual(captured.forwarded, realQuery);
  assert.deepEqual(captured.result, JSON.parse(run(original, realQuery)));
  assert.ok(["OK", "NO_MATCH"].includes(captured.result.status));
  output.controls.exact_34366_query = { schema_accepted: true, additional_properties_only_status: "INVALID_QUERY", forwarded: captured.forwarded, status: captured.result.status, returned_count: captured.result.returned_count };
  save("query-34366.response.json", captured.result);
});

test("literal candidate returns unchanged real PCRAM rows, source/version and bounded results", () => {
  const results = [];
  for (const q of [query, { indice: 2, prefijo: "95030060", texto: "plastico", limite: 2 }, { indice: 1, prefijo: "6109", texto: "camisetas", limite: 2 }]) {
    const response = JSON.parse(invoke({ ...context, ...q, rates: { duty: 99 }, query: { indice: 50, prefijo: "9999" } }));
    assert.deepEqual(response, JSON.parse(run(original, q)));
    assert.equal(response.status, "OK");
    assert.ok(response.results.length > 0 && response.results.length <= q.limite);
    assert.equal(response.source.zip_sha256, sourceSha);
    assert.equal(response.source.schema, "pcram-nomenclator-fixed-2134-v1");
    assert.ok(response.results.every(row => row.source_uri.includes(sourceSha) && row.sim && row.ncm_context));
    results.push({ query: q, response });
  }
  save("successful-responses.json", results);
  output.controls.real_snapshot_candidates = results.map(({ query, response }) => ({ query, status: response.status, count: response.returned_count, partial: response.partial, source_sha256: response.source.zip_sha256 }));
});

test("all four required fields stay strict at schema and adapter, no defaulting/coercion", () => {
  const bad = [];
  for (const key of ["indice", "prefijo", "texto", "limite"]) { const q = { ...query }; delete q[key]; bad.push({ label: `missing ${key}`, q }); }
  for (const [label, delta] of Object.entries({ "indice string": { indice: "1" }, "indice fractional": { indice: 1.5 }, "indice zero": { indice: 0 }, "indice too high": { indice: 101 }, "prefix null": { prefijo: null }, "prefix too long": { prefijo: "1".repeat(16) }, "text object": { texto: {} }, "text too long": { texto: "x".repeat(161) }, "limit string": { limite: "5" }, "limit fractional": { limite: 1.5 }, "limit zero": { limite: 0 }, "limit too high": { limite: 9 } })) bad.push({ label, q: { ...query, ...delta } });
  for (const { q } of bad) {
    assert.equal(schemaValidator(schemaAfter).safeParse({ ...context, ...q }).success, false);
    assert.equal(pcramSearchInput({ ...context, ...q }), null);
    assert.equal(JSON.parse(run(tool, { ...context, ...q })).status, "INVALID_QUERY");
  }
  for (const q of [null, [], "{}", Object.create(query)]) assert.equal(pcramSearchInput(q), null);
  output.controls.strict_parameters = { passed: true, negative_cases: bad.map(item => item.label), no_defaulting_or_coercion: true };
});

test("search format controls remain unchanged; nonexistent SIM is NO_MATCH, not repaired", () => {
  for (const delta of [{ prefijo: "85176272900" }, { prefijo: "85176272900UU" }, { prefijo: " 6109" }, { prefijo: "", texto: "aa" }, { prefijo: "", texto: "" }, { texto: "uno dos tres cuatro cinco seis siete ocho nueve" }])
    assert.equal(JSON.parse(invoke({ ...context, ...query, ...delta })).status, "INVALID_QUERY");
  assert.equal(JSON.parse(invoke({ ...context, ...query, prefijo: "99999999999Z" })).status, "NO_MATCH");
  output.controls.search_format = { passed: true, negative_cases: 6, nonexistent_code_status: "NO_MATCH" };
});

test("direct JSON string returned by Code Tool passes literal candidate validator", () => {
  const observation = invoke({ ...context, ...query });
  assert.deepEqual(guardClassification([product], [step(query, observation)], sourceSha), [product]);
  const validator = candidate.nodes.find(n => n.name === "Validar salida del agente").parameters.jsCode;
  const raw = { output: { productos: [product] }, intermediateSteps: [step(query, observation)] };
  const solicitud = { productos: [{ descripcion: "Contract fixture", link: "" }], solicitud_id: "local-contract-only" };
  const result = JSON.parse(JSON.stringify(runInNewContext(`(function(){${validator}})()`, { $input: { first: () => ({ json: raw }) }, $: () => ({ first: () => ({ json: { solicitud } }) }) }, { timeout: 5000 })));
  assert.equal(result[0].json.productos[0].SIM, product.SIM);
  output.controls.direct_result_guard = { passed: true, source_sha_matches: true, indice_matches: true };
});

test("wrong product index or SHA still rejects provenance; guard not weakened", () => {
  const response = JSON.parse(invoke(query));
  for (const s of [step({ ...query, indice: 2 }, JSON.stringify(response)), step(query, JSON.stringify({ ...response, source: { ...response.source, zip_sha256: "bad" } }))])
    assert.equal(guardClassification([product], [s], sourceSha)[0].SIM, null);
  output.controls.guard_negative = { passed: true, membership_and_provenance_checks_preserved: true };
});

test("reused input plus guard normalization only; frozen surfaces and both scoped rollbacks exact", () => {
  assert.equal(candidate.nodes.length, 12);
  const restored = structuredClone(candidate), t = find(restored);
  const v = restored.nodes.find(n => n.id === rollback.guard.node_id);
  assert.equal(hash(v.parameters.jsCode), rollback.guard.before_sha256);
  assert.ok(v.parameters.jsCode.startsWith(rollback.guard.replace_prefix));
  v.parameters.jsCode = rollback.guard.with_prefix + v.parameters.jsCode.slice(rollback.guard.replace_prefix.length);
  assert.equal(hash(v.parameters.jsCode), rollback.guard.after_sha256);
  const prior = load("docs/evidence/pcram-input-contract-2026-10-09/candidate.workflow.json");
  assert.deepEqual(restored, prior);
  assert.equal(t.parameters.inputSchema, rollback.changes.inputSchema.before);
  assert.equal(hash(t.parameters.jsCode), rollback.changes.jsCode.before_sha256);
  assert.ok(t.parameters.jsCode.endsWith(rollback.changes.jsCode.replace_suffix));
  t.parameters.inputSchema = rollback.changes.inputSchema.after;
  t.parameters.jsCode = t.parameters.jsCode.slice(0, -rollback.changes.jsCode.replace_suffix.length) + rollback.changes.jsCode.with_suffix;
  assert.equal(hash(t.parameters.jsCode), rollback.changes.jsCode.after_sha256);
  assert.deepEqual(restored, before);
  assert.equal(tool.parameters.jsCode.slice(0, -patch.changes.jsCode.with_suffix.length), original.parameters.jsCode.slice(0, -patch.changes.jsCode.replace_suffix.length));
  assert.deepEqual({ ...schemaAfter, additionalProperties: false }, schemaBefore);
  output.controls.scope_and_rollback = { passed: true, node_count: 12, exact_three_fields: true, only_new_guard_field: true, frozen_surfaces_identical: true, packed_index_decoder_and_search_identical: true, guard_only_recovery_to_4d74e4b_exact: true, combined_recovery_exact: true };
});

test("integral contract: input -> search -> Agent V3 wrapped response -> literal candidate validator", () => {
  const responseText = invoke({ ...context, ...query });
  // ToolCode.execute => json.response; buildObservation => stringify(ai_tool[0].map(item.json)).
  // This is the official source's local representative path, NOT a new Cloud execution.
  const observation = JSON.stringify([{ response: responseText }]);
  const result = literalValidator([product], [step(query, observation)]).productos;
  const passed = result[0].SIM === product.SIM;
  output.controls.agent_v3_wrapper_guard = { passed, source_basis: "official n8n master ToolCode.execute + agent-execution/buildSteps.buildObservation", cloud_installed_source_identity_verified: false, observation_shape: "[{response: JSON_string}]", normalized_source_sha256: sourceSha, result };
  output.status = passed ? "LOCAL_INTEGRAL_PASS_NOT_PUBLISHED" : "LOCAL_ACCEPTANCE_FAIL_NOT_PUBLISHED";
  save("engine-wrapped-success.json", { action: step(query, observation).action, observation, validator_result: result });
  assert.equal(passed, true, "Candidate must preserve the code through the full local wrapped-response contract.");
});

test("malformed, error, ambiguous and nested observations cannot provide membership", () => {
  const response = JSON.parse(invoke(query));
  const observations = [null, response, "", "{", "null", "true", "42", JSON.stringify([]),
    JSON.stringify([response]), JSON.stringify([{ error: "actual tool error" }]),
    diagnosis.tool.real_calls[0].observation,
    JSON.stringify([{ response: JSON.stringify(response) }, { response: JSON.stringify(response) }]),
    JSON.stringify([{ response: JSON.stringify(response), error: "ambiguous" }]),
    JSON.stringify([{ response: JSON.stringify(response), source: response.source }]),
    JSON.stringify([{ response }]), JSON.stringify([{ response: "broken JSON" }]),
    JSON.stringify([{ response: JSON.stringify([{ response: JSON.stringify(response) }]) }]),
    JSON.stringify({ ...response, response: JSON.stringify(response) }),
    JSON.stringify({ ...response, error: "error mixed with result" }),
    JSON.stringify([{ response: JSON.stringify({ ...response, errors: [] }) }]),
    JSON.stringify({ ...response, status: "ERROR" }),
    JSON.stringify({ ...response, results: [null] }),
    JSON.stringify({ ...response, results: [{ ncm: [], sim: product.SIM }] }),
    JSON.stringify([{ response: JSON.stringify({ ...response, query: { ...query, indice: "1" } }) }]),
    JSON.stringify([{ response: JSON.stringify({ ...response, source: { ...response.source, zip_sha256: "wrong" } }) }]),
  ];
  for (const observation of observations) {
    const result = literalValidator([product], [step(query, observation)]).productos[0];
    assert.equal(result.SIM, null);
    assert.equal(result.clasificacion, null);
    assert.equal(result.DIE, product.DIE);
  }
  for (const s of [step({ ...query, indice: 2 }, JSON.stringify([{ response: JSON.stringify(response) }])),
    { ...step(query, JSON.stringify([{ response: JSON.stringify(response) }])), action: { tool: "OtherTool", toolInput: query } }])
    assert.equal(literalValidator([product], [s]).productos[0].SIM, null);
  output.controls.observation_negatives = { passed: true, malformed_error_ambiguous_cases: observations.length, wrong_product_and_wrong_tool_rejected: true, estimated_DIE_not_changed: true };
});

test("membership stays per-product; unsupported/inconsistent codes rejected; partial estimate unchanged", () => {
  const watchText = invoke({ ...context, ...query });
  const toyQuery = { indice: 2, prefijo: "95030060", texto: "plastico", limite: 2 };
  const toyText = invoke({ ...context, ...toyQuery });
  const row = JSON.parse(toyText).results[0];
  const toy = { ...product, indice: 2, producto: "Toy contract fixture", clasificacion: row.ncm, SIM: row.sim, DIE: 20 };
  const steps = [step(query, JSON.stringify([{ response: watchText }])), step(toyQuery, toyText)];
  const accepted = literalValidator([product, toy], steps).productos;
  assert.equal(accepted[0].SIM, product.SIM); assert.equal(accepted[1].SIM, toy.SIM);
  const wrong = { ...toy, clasificacion: product.clasificacion, SIM: product.SIM };
  assert.equal(guardClassification([wrong], steps, sourceSha)[0].SIM, null);
  const unknown = { ...product, clasificacion: "99999999", SIM: "99999999999Z" };
  assert.equal(guardClassification([unknown], steps, sourceSha)[0].SIM, null);
  const mixed = { ...product, clasificacion: row.ncm };
  assert.equal(guardClassification([mixed], [...steps, step({ ...toyQuery, indice: 1 }, JSON.stringify({ ...JSON.parse(toyText), query: { ...toyQuery, indice: 1 } }))], sourceSha)[0].SIM, null);
  const partial = { ...product, clasificacion: "6109", SIM: null, DIE: 20 };
  assert.deepEqual(guardClassification([partial], [], sourceSha), [partial]);
  const missing = { ...query, prefijo: "99999999999Z" };
  assert.deepEqual(guardClassification([partial], [step(missing, JSON.stringify([{ response: invoke(missing) }]))], sourceSha), [partial]);
  output.controls.membership_and_estimation = { passed: true, per_product_isolation: true, unsupported_and_inconsistent_codes_rejected: true, partial_estimate_unchanged: true };
  save("two-product-contract.json", { steps, productos: accepted });
});

after(() => save("validation.json", output));
