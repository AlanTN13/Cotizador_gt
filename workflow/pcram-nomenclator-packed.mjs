import { inflateRaw } from "./vendor/tiny-inflate.mjs";

// Pure JS only: the generated Code Tool embeds the decoder; no imports at runtime.
function fromBase64(text) {
  if (typeof text !== "string" || text.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new Error("Invalid packed data");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out = new Uint8Array(text.length * 3 / 4 - (text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0));
  let bits = 0, value = 0, offset = 0;
  for (let i = 0; i < text.length && text[i] !== "="; i++) {
    value = (value << 6) | alphabet.indexOf(text[i]); bits += 6;
    if (bits >= 8) { bits -= 8; out[offset++] = (value >> bits) & 255; }
  }
  return out;
}

function unpack(block, stats) {
  const [length, checksum, encoded] = block;
  if (!Number.isInteger(length) || length < 1 || length > 8_000_000) throw new Error("Invalid packed size");
  const bytes = inflateRaw(fromBase64(encoded), new Uint8Array(length));
  if (bytes.length !== length) throw new Error("Packed length mismatch");
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
  if (((b * 65536 + a) >>> 0) !== checksum) throw new Error("Packed checksum mismatch");
  const parts = [];
  for (let i = 0; i < bytes.length; i += 4096) parts.push(String.fromCharCode(...bytes.subarray(i, i + 4096)));
  stats.inflated_bytes += length;
  return JSON.parse(parts.join(""));
}

export function loadPackedNomenclator(packed) {
  if (packed.format !== "pcram-query-prefix-word-deflate-v3") throw new Error("Unsupported index");
  const stats = { inflated_bytes: 0, shards_decoded: 0, ncm_checked: 0, sim_checked: 0, term_index_loaded: false };
  const catalog = unpack(packed.catalog, stats);
  if (catalog.codes.length !== packed.metadata.ncm_count) throw new Error("Catalog count mismatch");
  return { packed, catalog, terms: null, stats };
}

function decodePosting(encoded, count) {
  const bytes = fromBase64(encoded), ids = [];
  let previous = 0, delta = 0, shift = 0;
  for (const byte of bytes) {
    if (shift > 21) throw new Error("Invalid posting");
    delta |= (byte & 127) << shift;
    if (byte & 128) { shift += 7; continue; }
    const ident = previous + delta;
    if (ident >= count || (ids.length && ident <= previous)) throw new Error("Invalid posting order");
    ids.push(ident); previous = ident; delta = 0; shift = 0;
  }
  if (shift) throw new Error("Truncated posting");
  return ids;
}

function includesSorted(ids, value) {
  let lo = 0, hi = ids.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (ids[mid] < value) lo = mid + 1; else hi = mid; }
  return ids[lo] === value;
}

function setRange(bits, lo, hi) {
  if (hi <= lo) return;
  const first = lo >>> 5, last = (hi - 1) >>> 5;
  const left = -1 << (lo & 31), right = -1 >>> (31 - ((hi - 1) & 31));
  if (first === last) bits[first] |= left & right;
  else { bits[first] |= left; bits.fill(0xffffffff, first + 1, last); bits[last] |= right; }
}

function textMatches(runtime, terms, limit) {
  const { packed, catalog, stats } = runtime;
  if (!runtime.terms) { runtime.terms = unpack(packed.terms, stats); stats.term_index_loaded = true; }
  const { words, grams } = runtime.terms, size = packed.metadata.record_count;
  let combined;
  for (const term of terms) {
    const fragments = [...new Set(Array.from({ length: term.length - 2 }, (_, i) => term.slice(i, i + 3)))];
    const lists = fragments.map(g => grams[g] ? decodePosting(grams[g], words.length) : []);
    lists.sort((a, b) => a.length - b.length);
    const ids = lists[0].filter(id => lists.every(list => includesSorted(list, id)) && words[id][0].includes(term));
    const matches = new Uint32Array(Math.ceil(size / 32));
    for (const id of ids) {
      const [, ncms, sims] = words[id];
      for (const ncmId of decodePosting(ncms, catalog.codes.length))
        setRange(matches, catalog.sim_offsets[ncmId], catalog.sim_offsets[ncmId + 1]);
      for (const simId of decodePosting(sims, size)) matches[simId >>> 5] |= 1 << (simId & 31);
    }
    if (!combined) combined = matches;
    else for (let i = 0; i < matches.length; i++) combined[i] &= matches[i];
  }
  let matched = 0; const selected = [];
  for (let i = 0; i < combined.length; i++) {
    let value = combined[i];
    let count = value - ((value >>> 1) & 0x55555555);
    count = (count & 0x33333333) + ((count >>> 2) & 0x33333333);
    matched += Math.imul((count + (count >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
    while (value && selected.length < limit) {
      const bit = value & -value;
      selected.push(i * 32 + 31 - Math.clz32(bit)); value &= value - 1;
    }
  }
  return { matched, selected };
}

export function queryPackedNomenclator(runtime, query) {
  const { packed, catalog, stats } = runtime, source = packed.metadata;
  const base = { source, status: "INVALID_QUERY", results: [], partial: false };
  if (!query || typeof query !== "object" || Array.isArray(query)) return base;
  const { indice, prefijo = "", texto = "", limite = 6 } = query;
  if (!Number.isInteger(indice) || indice < 1 || indice > 100 ||
      typeof prefijo !== "string" || typeof texto !== "string" || texto.length > 160 ||
      !Number.isInteger(limite) || limite < 1 || limite > 8 ||
      Object.keys(query).some(k => !["indice", "prefijo", "texto", "limite"].includes(k))) return base;
  let prefix;
  if (prefijo === "" || /^(?:\d{4}|\d{6}|\d{8}|\d{11}[A-Z])$/.test(prefijo)) prefix = prefijo;
  else if (/^\d{4}\.\d{2}(?:\.\d{2}(?:\.\d{3}[A-Z])?)?$/.test(prefijo)) prefix = prefijo.replaceAll(".", "");
  else return base;
  const fold = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const terms = [...new Set(fold(texto).match(/[a-z0-9]+/g) || [])];
  if (terms.length > 8 || terms.some(t => t.length < 3) || (!prefix && terms.length === 0)) return base;

  const resultRow = (ncm, context, contextFull, row) => ({
    ncm, sim: row[0], sim_description: row[1], ncm_context: context, updated_at: row[2],
    description_limits: { sim_field_full: row[3], ncm_field_full: contextFull, completeness_not_guaranteed: true },
    source_uri: `pcram://${source.zip_sha256}/sim/${row[0]}`,
  });
  const response = (matched, results) => ({
    source, status: matched ? "OK" : "NO_MATCH", query: { indice, prefijo, texto, limite },
    matched_count: matched, returned_count: results.length, partial: matched > results.length,
    coverage: "Only matches of this query; no inference of tax homogeneity or product compatibility", results,
  });
  let ids;
  if (prefix) {
    // Structural lookup only. Full SIM remains intact in the final exact-prefix filter.
    const range = catalog.prefixes[prefix.length === 12 ? prefix.slice(0, 8) : prefix];
    ids = range ? Array.from({ length: range[1] - range[0] }, (_, i) => range[0] + i) : [];
  } else {
    // Exact word/subword postings count matches without visiting source descriptions.
    const { matched, selected } = textMatches(runtime, terms, limite), results = [];
    let shardCode = null, rows = null;
    for (const simId of selected) {
      let lo = 0, hi = catalog.codes.length;
      while (lo + 1 < hi) { const mid = (lo + hi) >>> 1; if (catalog.sim_offsets[mid] <= simId) lo = mid; else hi = mid; }
      const ncm = catalog.codes[lo], hs4 = ncm.slice(0, 4);
      if (hs4 !== shardCode) { rows = unpack(packed.shards[hs4], stats); shardCode = hs4; stats.shards_decoded++; }
      const [context, full, sims] = rows[lo - catalog.prefixes[hs4][0]];
      results.push(resultRow(ncm, context, full, sims[simId - catalog.sim_offsets[lo]]));
      stats.ncm_checked++; stats.sim_checked++;
    }
    return response(matched, results);
  }

  const results = []; let matched = 0, shardCode = null, rows = null;
  for (const id of ids) {
    const ncm = catalog.codes[id], hs4 = ncm.slice(0, 4);
    if (hs4 !== shardCode) {
      rows = unpack(packed.shards[hs4], stats); shardCode = hs4; stats.shards_decoded++;
    }
    const [context, contextFull, sims] = rows[id - catalog.prefixes[hs4][0]];
    stats.ncm_checked++;
    const contextFolded = fold(context);
    const remaining = terms.filter(t => !contextFolded.includes(t));
    for (const [sim, description, updatedAt, simFull] of sims) {
      stats.sim_checked++;
      if (prefix && !sim.startsWith(prefix)) continue;
      if (remaining.length && !remaining.every(t => fold(description).includes(t))) continue;
      matched++;
      if (results.length < limite) results.push(resultRow(ncm, context, contextFull, [sim, description, updatedAt, simFull]));
    }
  }
  return response(matched, results);
}
