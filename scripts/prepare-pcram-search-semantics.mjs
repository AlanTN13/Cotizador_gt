import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/evidence/pcram-search-semantics-2026-10-09');
const baselineFile = 'docs/evidence/pcram-contract-closure-2026-10-09/publication-api/published.api-export.json';
const read = file => readFileSync(path.join(root, file), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const before = JSON.parse(read(baselineFile));
const tool = w => w.nodes.find(n => n.name === 'Consulta_nomenclador_PCRAM');
const beforeCode = tool(before).parameters.jsCode;
assert.equal(before.versionId, '6028105a-7aba-45ca-88a6-4d60c27a3cf4');
assert.equal(before.nodes.length, 12);
assert.equal(hash(beforeCode), 'ee5752f5910f77a96df13a927702094d7ad6ad68c873752c4aed635fd722e193');
// Immutable approved baseline, independent of the current working-tree revision.
const modulePath = 'workflow/pcram-nomenclator-packed.mjs';
const moduleBefore = execFileSync('git', ['show', `e4f7ebc:${modulePath}`], { cwd: root, encoding: 'utf8' });
const embed = text => text.replace(/^import[^\n]+\n/, '').replaceAll('export function', 'function');
const lookupBefore = embed(moduleBefore), lookupAfter = embed(read(modulePath));
assert.equal(beforeCode.split(lookupBefore).length, 2, 'Exact search anchor must occur once');
const candidate = structuredClone(before);
tool(candidate).parameters.jsCode = beforeCode.replace(lookupBefore, lookupAfter);
const afterCode = tool(candidate).parameters.jsCode;
const nodeIndex = before.nodes.indexOf(tool(before));
const patch = { workflow_id: before.id, baseline_version: before.versionId, node_id: tool(before).id,
  node_name: tool(before).name, path: `/nodes/${nodeIndex}/parameters/jsCode`,
  before_sha256: hash(beforeCode), after_sha256: hash(afterCode),
  replace: lookupBefore, with: lookupAfter,
  condition: 'Before any future publication: fresh read must match baseline and every frozen field. Apply only this jsCode search anchor, never import candidate workflow.' };
const rollback = { ...patch, before_sha256: patch.after_sha256, after_sha256: patch.before_sha256,
  replace: lookupAfter, with: lookupBefore,
  condition: 'Fresh read must match candidate hash and frozen surfaces; restore only the tool search anchor, never a whole workflow.' };
const restored = structuredClone(candidate);
tool(restored).parameters.jsCode = afterCode.replace(rollback.replace, rollback.with);
assert.deepEqual(restored, before);
assert.equal(afterCode.split(lookupAfter).length, 2);
const unchanged = structuredClone(candidate);
tool(unchanged).parameters.jsCode = beforeCode;
assert.deepEqual(unchanged, before);
const packedPath = 'data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json';
mkdirSync(out, { recursive: true });
for (const [name, value] of Object.entries({ 'patch.json': patch, 'rollback.patch.json': rollback,
  'candidate.workflow.json': candidate, 'preparation.json': {
    status: 'PREPARED_LOCAL_NOT_PUBLISHED', context_revision: 'ebe7a81', baseline_file: baselineFile,
    baseline_saved_export_not_new_live_read: true, baseline_version: before.versionId,
    changed_paths: [patch.path], node_count: candidate.nodes.length,
    tool_before_sha256: patch.before_sha256, tool_candidate_sha256: patch.after_sha256,
    candidate_file_sha256: hash(JSON.stringify(candidate, null, 2) + '\n'),
    packed_index_sha256: hash(readFileSync(path.join(root, packedPath))),
    frozen_surfaces_identical: true, exact_scoped_recovery: true,
    bytes: { before_tool: Buffer.byteLength(beforeCode), candidate_tool: Buffer.byteLength(afterCode), delta: Buffer.byteLength(afterCode) - Buffer.byteLength(beforeCode) },
    cloud_runs: 0, model_calls: 0, pcram_downloads: 0,
  },
})) writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
writeFileSync(path.join(out, 'search.before.js'), lookupBefore);
writeFileSync(path.join(out, 'search.after.js'), lookupAfter);
console.log(JSON.stringify({ status: 'PREPARED_LOCAL_NOT_PUBLISHED', changed_path: patch.path, node_count: 12,
  before_sha256: patch.before_sha256, after_sha256: patch.after_sha256, scoped_rollback_exact: true }));
