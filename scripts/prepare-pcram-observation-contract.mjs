import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const priorDir = "docs/evidence/pcram-input-contract-2026-10-09";
const out = path.join(root, "docs/evidence/pcram-contract-closure-2026-10-09");
const read = name => readFileSync(path.join(root, name), "utf8");
const hash = value => createHash("sha256").update(value).digest("hex");
const baselineFile = "docs/evidence/nomenclator-existing-workflow-prepared-2026-10-09/publication-api-verified/published.api-export.json";
const baseline = JSON.parse(read(baselineFile));
const prior = JSON.parse(read(`${priorDir}/candidate.workflow.json`));
const priorPatch = JSON.parse(read(`${priorDir}/patch.json`));
const priorRollback = JSON.parse(read(`${priorDir}/rollback.patch.json`));
const validator = w => w.nodes.find(n => n.name === "Validar salida del agente");
const codeBefore = validator(prior).parameters.jsCode;
assert.equal(prior.nodes.length, 12);
assert.equal(prior.versionId, "a4ee337d-4235-4f6b-9d5e-81259c1c2ee8");
assert.equal(hash(codeBefore), "bdcb972ef657fb5ad8ecf3ec880ceaf57875504370670439df4139d9a5d61be2");
const marker = "\nfunction parseAgent(raw,s){";
assert.equal(codeBefore.split(marker).length, 2);
const guardBefore = codeBefore.slice(0, codeBefore.indexOf(marker));
const guardAfter = read("workflow/pcram-classification-guard.mjs").replace("export function", "function");
const candidate = structuredClone(prior);
validator(candidate).parameters.jsCode = guardAfter + codeBefore.slice(guardBefore.length);
const codeAfter = validator(candidate).parameters.jsCode;
const guardPatch = {
  node_id: validator(prior).id, node_name: validator(prior).name,
  path: `/nodes/${prior.nodes.indexOf(validator(prior))}/parameters/jsCode`,
  before_sha256: hash(codeBefore), after_sha256: hash(codeAfter),
  replace_prefix: guardBefore, with_prefix: guardAfter,
};
const guardRollback = { ...guardPatch, before_sha256: guardPatch.after_sha256, after_sha256: guardPatch.before_sha256,
  replace_prefix: guardAfter, with_prefix: guardBefore };
const restored = structuredClone(candidate);
validator(restored).parameters.jsCode = codeBefore;
assert.deepEqual(restored, prior);
const t = restored.nodes.find(n => n.id === priorRollback.node_id);
assert.equal(hash(t.parameters.jsCode), priorRollback.changes.jsCode.before_sha256);
t.parameters.inputSchema = priorRollback.changes.inputSchema.after;
t.parameters.jsCode = t.parameters.jsCode.slice(0, -priorRollback.changes.jsCode.replace_suffix.length) + priorRollback.changes.jsCode.with_suffix;
assert.deepEqual(restored, baseline);
mkdirSync(out, { recursive: true });
for (const [name, value] of Object.entries({
  "candidate.workflow.json": candidate,
  "patch.json": { ...priorPatch, guard: guardPatch },
  "rollback.patch.json": { ...priorRollback, guard: guardRollback,
    condition: "Fresh live read must match all candidate schema/tool/validator hashes and frozen surfaces. Restore only the tool schema/suffix and guard prefix, preserving every other current field. Never import an old workflow." },
  "guard.rollback.patch.json": { workflow_id: baseline.id, ...guardRollback,
    condition: "Require candidate validator hash and prefix. Reverse only normalization, preserving the reused 4d74e4b input patch and all other fields." },
})) writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n");
writeFileSync(path.join(out, "guard.before.js"), guardBefore);
writeFileSync(path.join(out, "guard.after.js"), guardAfter);
writeFileSync(path.join(out, "input.diff.exact.txt"), read(`${priorDir}/diff.exact.txt`));
writeFileSync(path.join(out, "preparation.json"), JSON.stringify({
  status: "PREPARED_LOCAL_NOT_PUBLISHED", baseline_version: baseline.versionId, node_count: 12,
  context_revision: "03dc887d56b6e47b94b079f7429716f358b2ee3c",
  reused_input_commit: "4d74e4b7d5d8af1c55149b1a2ad11f024dcae200", baseline_file: baselineFile,
  baseline_is_saved_export_not_fresh_live_read: true,
  changed_paths: [`/nodes/11/parameters/inputSchema`, `/nodes/11/parameters/jsCode`, guardPatch.path],
  only_new_change_from_4d74e4b: guardPatch.path,
  validator_before_sha256: guardPatch.before_sha256, validator_candidate_sha256: guardPatch.after_sha256,
  input_tool_unchanged_from_4d74e4b_sha256: priorPatch.changes.jsCode.after_sha256,
  schema_unchanged_from_4d74e4b_sha256: hash(priorPatch.changes.inputSchema.after),
  frozen_surfaces_identical: true, validator_parseAgent_suffix_unchanged: true,
  guard_only_rollback_exact: true, combined_rollback_exact: true,
  required_gate: "Explicit publication authorization and fresh live baseline verification; no Cloud or model runs in preparation.",
}, null, 2) + "\n");
console.log("Prepared guard-only delta atop unchanged input patch; 12 nodes; exact scoped recovery.");
