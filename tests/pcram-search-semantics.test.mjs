import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { loadPackedNomenclator, queryPackedNomenclator } from '../workflow/pcram-nomenclator-packed.mjs';
import { queryNomenclator } from '../workflow/pcram-nomenclator-query.mjs';

const root = new URL('../', import.meta.url);
const read = file => fs.readFileSync(new URL(file, root), 'utf8');
const load = file => JSON.parse(read(file));
const dir = 'docs/evidence/pcram-search-semantics-2026-10-09/';
const before = load('docs/evidence/pcram-contract-closure-2026-10-09/publication-api/published.api-export.json');
const candidate = load(dir + 'candidate.workflow.json');
const packedFile = 'data/pcram-nomenclator/4cd912aa9f8843421bbe18dbf990fbecd2a5a070ba59723137d81f938f18079c.indexed-v3.json';
const packedBytes = read(packedFile), packed = JSON.parse(packedBytes);
const index = load(packedFile.replace('.indexed-v3.json', '.json'));
const hash = text => createHash('sha256').update(text).digest('hex');
const tool = w => w.nodes.find(n => n.name === 'Consulta_nomenclador_PCRAM');
const q = (prefijo = '', texto = '', limite = 5) => ({ indice: 1, prefijo, texto, limite });
const exact = [q('61', 'camiseta running'), q('', 'camiseta running camiseta deportiva camiseta de correr polyester algodón')];
const literal = (w, query) => JSON.parse(runInNewContext(`(function(){${tool(w).parameters.jsCode}})()`, { query }, { timeout: 5000 }));
const search = query => queryPackedNomenclator(loadPackedNomenclator(packed), query);
const validate = (products, steps) => {
  const raw = { output: { productos: products }, intermediateSteps: steps };
  const solicitud = { solicitud_id: 'offline-contract-fixture', productos: products.map(p => ({ descripcion: p.producto, link: '' })) };
  const js = candidate.nodes.find(n => n.name === 'Validar salida del agente').parameters.jsCode;
  return JSON.parse(JSON.stringify(runInNewContext(`(function(){${js}})()`, {
    $input: { first: () => ({ json: raw }) }, $: () => ({ first: () => ({ json: { solicitud } }) }),
  }, { timeout: 5000 })))[0].json.productos;
};
const product = row => ({ indice: 1, producto: 'Synthetic contract fixture, not agent classification', clasificacion: row.ncm,
  SIM: row.sim, DIE: 20, evidencia: [], fundamento: 'Local membership test only' });
const step = (query, response) => ({ action: { tool: 'Consulta_nomenclador_PCRAM', toolInput: query },
  observation: JSON.stringify([{ response: JSON.stringify(response) }]) });

test('exact #34375 inputs: reproduce both baseline INVALID_QUERY, corrected authentic NO_MATCH', () => {
  for (const query of exact) {
    assert.equal(literal(before, query).status, 'INVALID_QUERY');
    const response = literal(candidate, query);
    assert.equal(response.status, 'NO_MATCH');
    assert.deepEqual(response, queryNomenclator(index, query));
    assert.deepEqual(response.results, []);
    assert.deepEqual(response.query, query);
    assert.equal(response.source.zip_sha256, packed.metadata.zip_sha256);
  }
});

test('HS2 reuses HS4 ranges; only chapter records visited, no global SIM traversal', () => {
  const runtime = loadPackedNomenclator(packed), response = queryPackedNomenclator(runtime, q('61', 'camisetas', 3));
  assert.equal(response.status, 'OK'); assert.equal(response.results.length, 3); assert.equal(response.partial, true);
  assert.ok(response.results.every(row => row.ncm.startsWith('61') && row.sim.startsWith('61')));
  assert.deepEqual(response, queryNomenclator(index, q('61', 'camisetas', 3)));
  const chapterRows = index.sims.filter(row => row[0].startsWith('61')).length;
  assert.equal(runtime.stats.sim_checked, chapterRows);
  assert.ok(chapterRows < 1000); assert.equal(runtime.stats.term_index_loaded, false);
  assert.equal(search(q('99')).status, 'NO_MATCH');
});

test('only explicit short function words omitted; original input and ignored terms traceable', () => {
  const query = q('6109', 'camisetas de la'), response = search(query), plain = search(q('6109', 'camisetas'));
  assert.equal(response.status, 'OK'); assert.deepEqual(response.results, plain.results);
  assert.equal(response.matched_count, plain.matched_count);
  assert.deepEqual(response.query, query);
  assert.deepEqual(response.normalization, { ignored_terms: ['de', 'la'], terms: ['camisetas'] });
  assert.deepEqual(search(q('', 'DE el la en un y o')).status, 'INVALID_QUERY');
  for (const token of ['de', 'el', 'la', 'en', 'un', 'y', 'o'])
    assert.equal(search(q('6109', `camisetas ${token}`)).status, 'OK');
});

test('prior supported searches remain byte-equivalent at response level', () => {
  for (const query of [q('85176272', 'frecuencia'), q('95030060', 'plastico', 2), q('6109', 'camisetas'),
    q('99999999999Z'), q('85176272900U', 'algodon'), q('', 'camisetas'), q('', 'plastico construccion'),
    q('', 'camis'), q('', 'plástico'), q('', 'los'), q('8517.62.72.900U'), q('95030060', 'construccion', 8)])
    assert.deepEqual(literal(candidate, query), literal(before, query));
});

test('invalid short content, malformed prefixes, extra search keys and bounds stay rejected', () => {
  const runtime = loadPackedNomenclator(packed);
  const bad = [null, [], 'query', q('', ''), q('', 'de'), q('', 'aa de'), q('6109', 'x'), q('', 'ab'),
    q('6'), q('610'), q('61090'), q('61.09'), q(' 61'), q('85176272900'), q('85176272900UU'),
    q('6109', 'camisetas', 9), q('6109', '', 0), q('6109', '', 1.5), q('6109', 'x'.repeat(161)),
    q('', 'uno dos tres cuatro cinco seis siete ocho nueve'), { ...q('61'), indice: '1' },
    { ...q('61'), indice: 0 }, { ...q('61'), indice: 101 }, { ...q('61'), indice: 1.5 },
    { ...q('61'), prefijo: null }, { ...q('61'), texto: {} }, { ...q('61'), rates: {} }];
  for (const query of bad) assert.equal(queryPackedNomenclator(runtime, query).status, 'INVALID_QUERY', JSON.stringify(query));
});

test('real rows and source/date/limits immutable; no fabricated positions or rates', () => {
  for (const query of [q('61', 'camisetas', 1), q('85176272900U'), q('95030060', 'plastico', 8)]) {
    const response = search(query);
    assert.equal(response.status, 'OK'); assert.ok(response.returned_count <= query.limite);
    assert.deepEqual(response.source, packed.metadata);
    for (const row of response.results) {
      const source = index.sims.find(entry => entry[0] === row.sim);
      assert.ok(source); assert.equal(row.sim_description, source[1]); assert.equal(row.updated_at, source[2]);
      assert.equal(row.ncm_context, index.ncms[row.ncm][0]);
      assert.equal(row.source_uri, `pcram://${packed.metadata.zip_sha256}/sim/${row.sim}`);
      assert.ok(row.description_limits.completeness_not_guaranteed);
      assert.equal(row.DIE, undefined); assert.equal(row.TE, undefined); assert.equal(row.IVA, undefined);
    }
  }
  assert.equal(hash(read(packedFile)), hash(packedBytes));
});

test('literal candidate input projection -> search -> wrapped response -> unchanged guard', () => {
  const query = q('61', 'camisetas', 2);
  const response = literal(candidate, { solicitud: {}, siguiente: 'cotizar', toolCallId: 'offline', ...query });
  const p = product(response.results[0]);
  assert.deepEqual(validate([p], [step(query, response)]), [p]);
  const noMatch = literal(candidate, exact[1]);
  const partial = { ...p, clasificacion: '6109', SIM: null };
  assert.deepEqual(validate([partial], [step(exact[1], noMatch)]), [partial]);
});

test('guard preserves source, SHA, product index and candidate membership checks', () => {
  const query = q('61', 'camisetas', 2), response = literal(candidate, query), p = product(response.results[0]);
  const wrong = [step(query, { ...response, source: { ...response.source, zip_sha256: 'wrong' } }),
    step({ ...query, indice: 2 }, response), step(query, { ...response, query: { ...query, indice: 2 } }),
    { ...step(query, response), action: { tool: 'OtherTool', toolInput: query } },
    { ...step(query, response), observation: JSON.stringify([{ error: 'tool failed' }]) },
    { ...step(query, response), observation: '{' }];
  for (const s of wrong) assert.equal(validate([p], [s])[0].SIM, null);
  assert.equal(validate([{ ...p, clasificacion: '99999999', SIM: '99999999999Z' }], [step(query, response)])[0].SIM, null);
  assert.equal(validate([p], [step(query, { ...response, results: [] })])[0].SIM, null);
});

test('12 nodes, only tool jsCode changes; embedded index/decoder/adapter intact; exact rollback', () => {
  const patch = load(dir + 'patch.json'), rollback = load(dir + 'rollback.patch.json');
  assert.equal(candidate.nodes.length, 12);
  assert.equal(hash(tool(before).parameters.jsCode), patch.before_sha256);
  assert.equal(hash(tool(candidate).parameters.jsCode), patch.after_sha256);
  assert.ok(Buffer.byteLength(tool(candidate).parameters.jsCode) < 3_000_000);
  const restored = structuredClone(candidate);
  tool(restored).parameters.jsCode = tool(restored).parameters.jsCode.replace(rollback.replace, rollback.with);
  assert.equal(hash(tool(restored).parameters.jsCode), rollback.after_sha256); assert.deepEqual(restored, before);
  const beforeParts = tool(before).parameters.jsCode.split(patch.replace), afterParts = tool(candidate).parameters.jsCode.split(patch.with);
  assert.equal(beforeParts.length, 2); assert.deepEqual(afterParts, beforeParts);
});
