import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineFile = "docs/evidence/nomenclator-existing-workflow-prepared-2026-10-09/publication-api-verified/published.api-export.json";
const out = path.join(root, "docs/evidence/pcram-input-contract-2026-10-09");
const baselineBytes = readFileSync(path.join(root, baselineFile));
const before = JSON.parse(baselineBytes);
const hash = value => createHash("sha256").update(value).digest("hex");
const find = w => w.nodes.find(n => n.name === "Consulta_nomenclador_PCRAM");
const toolBefore = find(before);
assert.equal(before.versionId, "a4ee337d-4235-4f6b-9d5e-81259c1c2ee8");
assert.equal(before.nodes.length, 12);
assert.equal(hash(toolBefore.parameters.jsCode), "a018e8e2e0f4fdb6869f3887bd8f28c0dc36d7c565902027683cb062f2a82ee9");
const oldTail = "return JSON.stringify(queryPackedNomenclator(runtime, query));\n";
assert.ok(toolBefore.parameters.jsCode.endsWith(oldTail));
const adapter = readFileSync(path.join(root, "workflow/pcram-tool-input.mjs"), "utf8").replace("export function", "function");
const newTail = `${adapter}\nreturn JSON.stringify(queryPackedNomenclator(runtime, pcramSearchInput(query)));\n`;
const after = structuredClone(before);
const toolAfter = find(after);
const schemaBefore = JSON.parse(toolBefore.parameters.inputSchema);
assert.equal(schemaBefore.additionalProperties, false);
const schemaAfter = { ...schemaBefore, additionalProperties: true };
toolAfter.parameters.inputSchema = JSON.stringify(schemaAfter);
toolAfter.parameters.jsCode = toolBefore.parameters.jsCode.slice(0, -oldTail.length) + newTail;
const restored = structuredClone(after);
find(restored).parameters = structuredClone(toolBefore.parameters);
assert.deepEqual(restored, before);
const patch = {
  workflow_id: before.id, node_id: toolBefore.id, node_name: toolBefore.name,
  baseline_version: before.versionId, never_import_full_workflow: true,
  changes: {
    inputSchema: { before: toolBefore.parameters.inputSchema, after: toolAfter.parameters.inputSchema },
    jsCode: { before_sha256: hash(toolBefore.parameters.jsCode), after_sha256: hash(toolAfter.parameters.jsCode), replace_suffix: oldTail, with_suffix: newTail },
  },
};
const rollback = structuredClone(patch);
rollback.changes.inputSchema = { before: patch.changes.inputSchema.after, after: patch.changes.inputSchema.before };
rollback.changes.jsCode = { before_sha256: patch.changes.jsCode.after_sha256, after_sha256: patch.changes.jsCode.before_sha256, replace_suffix: newTail, with_suffix: oldTail };
rollback.baseline_version = null;
rollback.condition = "Read current workflow first. Require candidate code/schema hashes and no unrelated changes. Restore only these two tool fields, preserve all other current fields. No full-workflow import.";
const index = before.nodes.indexOf(toolBefore);
const diff = [
  `--- published/${toolBefore.name}`, `+++ candidate/${toolBefore.name}`,
  `@@ /nodes/${index}/parameters/inputSchema (all four property rules and required unchanged) @@`,
  '- "additionalProperties": false', '+ "additionalProperties": true',
  `@@ /nodes/${index}/parameters/jsCode (unchanged prefix omitted; byte-identical index/decoder/search) @@`,
  ...oldTail.trimEnd().split("\n").map(l => "-" + l),
  ...newTail.trimEnd().split("\n").map(l => "+" + l), "",
].join("\n");
mkdirSync(out, { recursive: true });
for (const [name, value] of Object.entries({ "candidate.workflow.json": after, "patch.json": patch, "rollback.patch.json": rollback }))
  writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n");
writeFileSync(path.join(out, "diff.exact.txt"), diff);
writeFileSync(path.join(out, "preparation.json"), JSON.stringify({
  status: "PREPARED_OFFLINE_NOT_PUBLISHED", baseline_file: baselineFile,
  baseline_file_sha256: hash(baselineBytes), baseline_version: before.versionId,
  baseline_is_saved_published_export_not_fresh_live_read: true,
  tool_before_sha256: patch.changes.jsCode.before_sha256, tool_candidate_sha256: patch.changes.jsCode.after_sha256,
  schema_before_sha256: hash(toolBefore.parameters.inputSchema), schema_candidate_sha256: hash(toolAfter.parameters.inputSchema),
  node_count: 12, changed_paths: [`/nodes/${index}/parameters/inputSchema`, `/nodes/${index}/parameters/jsCode`],
  frozen_surfaces_identical: true, rollback_exact: true,
  unchanged_code_prefix_sha256: hash(toolBefore.parameters.jsCode.slice(0, -oldTail.length)),
  tool_before_bytes: Buffer.byteLength(toolBefore.parameters.jsCode), tool_candidate_bytes: Buffer.byteLength(toolAfter.parameters.jsCode),
  required_gate: "Explicit publication authorization plus fresh live baseline verification. Zero Cloud/agent calls during preparation.",
}, null, 2) + "\n");
console.log("Prepared two-field tool patch and scoped rollback; no Cloud calls.");
