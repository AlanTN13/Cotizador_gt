// Offline preparation checks. These are not agent/model behavior tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const dir = new URL('docs/evidence/pcram-agent-retry-prepared-2026-10-09/', root);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const artifact = path => fs.readFileSync(new URL(path, dir), 'utf8');
const receipt = JSON.parse(artifact('receipt.json'));
const baseline = JSON.parse(read(receipt.baseline_saved_export));
const patch = JSON.parse(artifact('candidate.patch.json'));
const rollback = JSON.parse(artifact('rollback.patch.json'));
const hash = text => createHash('sha256').update(text).digest('hex');
const node = (w, name) => w.nodes.find(n => n.name === name);
const before = artifact('prompt.before.txt');
const after = artifact('prompt.after.txt');

test('one prompt field only; hashes and guarded prompt-only rollback', () => {
  assert.equal(baseline.nodes.length, 12);
  assert.equal(node(baseline, patch.node_name).parameters.options.systemMessage, before);
  assert.equal(patch.field, 'parameters.options.systemMessage');
  assert.equal(patch.expected_current_sha256, hash(before));
  assert.equal(patch.replacement_sha256, hash(after));
  assert.equal(patch.value, after);
  assert.equal(rollback.expected_current_sha256, hash(after));
  assert.equal(rollback.value, before);
  const candidate = structuredClone(baseline);
  node(candidate, patch.node_name).parameters.options.systemMessage = patch.value;
  const neutral = structuredClone(candidate);
  node(neutral, patch.node_name).parameters.options.systemMessage = before;
  assert.deepEqual(neutral, baseline); // all 12 nodes/connections/settings/credentials frozen
  node(candidate, rollback.node_name).parameters.options.systemMessage = rollback.value;
  assert.deepEqual(candidate, baseline);
});

test('static policy: one retry after NO_MATCH, existing two-call budget and prudence retained', () => {
  const start = 'Usá como máximo dos consultas';
  const end = '\nLa consulta devuelve';
  const unchanged = text => text.slice(0, text.indexOf(start)) + text.slice(text.indexOf(end));
  assert.deepEqual(unchanged(after), unchanged(before));
  for (const phrase of ['Si la primera devuelve NO_MATCH', 'un único reintento más amplio',
    'prefijo de la familia sustentada con texto vacío', 'sólo el término principal',
    'Conservá el mismo indice y limite', 'nunca hagas una tercera',
    'ni reintentes por INVALID_QUERY o error', 'todos los atributos disponibles del producto original',
    'SIM=null cuando no esté acreditado', 'no inventes un prefijo']) assert.ok(after.includes(phrase), phrase);
  assert.ok(after.includes('si falta composición, tecnología u otro atributo decisivo, no lo supongas'));
  assert.ok(after.includes('no selecciones una apertura residual por descarte'));
  assert.ok(after.includes('El Tax Resolver posterior') || after.includes('el Tax Resolver posterior'));
  assert.doesNotMatch(after.slice(after.indexOf(start), after.indexOf(end)), /6109|85176272|95030060|20%/);
});

let initial, family, mainTerm;
test('actual frozen Code Tool: commercial NO_MATCH and both permitted broad-query shapes', () => {
  const indexPath = 'data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json';
  assert.equal(hash(read(indexPath)), receipt.index_sha256);
  const code = node(baseline, 'Consulta_nomenclador_PCRAM').parameters.jsCode;
  assert.equal(hash(code), '2732532f986dc19258d8602b718c47222edbd2d88a3583240986031f82edd8a5');
  const query = (prefijo, texto) => JSON.parse(runInNewContext(`(function(){${code}})()`,
    { query: { indice: 1, prefijo, texto, limite: 5 } }, { timeout: 5000 }));
  initial = query('', 'camiseta running');
  family = query('6109', '');
  mainTerm = query('', 'camiseta');
  assert.equal(initial.status, 'NO_MATCH'); assert.equal(initial.matched_count, 0);
  for (const [r, count] of [[family, 10], [mainTerm, 52]]) {
    assert.equal(r.status, 'OK'); assert.equal(r.matched_count, count);
    assert.equal(r.returned_count, 5); assert.equal(r.partial, true);
    assert.equal(r.query.indice, initial.query.indice); assert.equal(r.query.limite, initial.query.limite);
    assert.equal(r.source.zip_sha256, initial.source.zip_sha256);
    assert.ok(r.results.every(row => row.source_uri.includes(r.source.zip_sha256)));
  }
  for (const [file, r] of [['initial.response.json', initial], ['family-retry.response.json', family], ['main-term-retry.response.json', mainTerm]]) {
    fs.writeFileSync(new URL(file, dir), JSON.stringify(r, null, 2) + '\n');
  }
  assert.equal(hash(read(indexPath)), receipt.index_sha256);
});

test('literal frozen validator: broad candidates do not force a SIM; unaudited identifiers rejected', () => {
  assert.ok(initial && family);
  const code = node(baseline, 'Validar salida del agente').parameters.jsCode;
  const step = r => ({ action: { tool: 'Consulta_nomenclador_PCRAM', toolInput: r.query },
    observation: JSON.stringify([{ response: JSON.stringify(r) }]) });
  const partial = { indice: 1, producto: 'Synthetic validator fixture, not agent output',
    clasificacion: '6109', SIM: null, DIE: 20, evidencia: [],
    fundamento: 'Estimación: composición no verificada; sin apertura acreditada.' };
  const run = (p, steps) => JSON.parse(JSON.stringify(runInNewContext(`(function(){${code}})()`, {
    $input: { first: () => ({ json: { output: { productos: [p] }, intermediateSteps: steps } }) },
    $: () => ({ first: () => ({ json: { solicitud: { productos: [{ descripcion: 'camiseta running', link: '' }] } } }) }),
  }, { timeout: 5000 })))[0].json.productos[0];
  assert.deepEqual(run(partial, [step(initial), step(family)]), partial);
  const unaccredited = { ...partial, clasificacion: '99999999', SIM: '99999999999Z' };
  const rejected = run(unaccredited, [step(initial), step(family)]);
  assert.equal(rejected.SIM, null); assert.equal(rejected.clasificacion, null);
  assert.equal(rejected.DIE, partial.DIE);
});
