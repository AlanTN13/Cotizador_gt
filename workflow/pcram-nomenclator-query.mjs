// Pure lexical lookup. No network, mutation, rates, ranking by tax, or model.
export function queryNomenclator(index, query) {
  const source = index.metadata;
  const base = { source, status: "INVALID_QUERY", results: [], partial: false };
  if (!query || typeof query !== "object" || Array.isArray(query)) return base;
  const { indice, prefijo = "", texto = "", limite = 6 } = query;
  if (!Number.isInteger(indice) || indice < 1 || indice > 100 ||
      typeof prefijo !== "string" || typeof texto !== "string" ||
      texto.length > 160 || !Number.isInteger(limite) || limite < 1 || limite > 8 ||
      Object.keys(query).some(k => !["indice", "prefijo", "texto", "limite"].includes(k))) return base;
  // Accept only declared formats. No padding, trimming digits or guessed control letter.
  let prefix;
  if (prefijo === "" || /^(?:\d{2}|\d{4}|\d{6}|\d{8}|\d{11}[A-Z])$/.test(prefijo)) prefix = prefijo;
  else if (/^\d{4}\.\d{2}(?:\.\d{2}(?:\.\d{3}[A-Z])?)?$/.test(prefijo)) prefix = prefijo.replaceAll(".", "");
  else return base;
  const fold = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Explicit short Spanish function words only; unknown short tokens still fail closed.
  const tokens = [...new Set(fold(texto).match(/[a-z0-9]+/g) || [])];
  const ignoredTerms = tokens.filter(t => ["de", "el", "la", "en", "un", "y", "o"].includes(t));
  const terms = tokens.filter(t => !ignoredTerms.includes(t));
  if (terms.length > 8 || (terms.some(t => t.length < 3)) || (!prefix && terms.length === 0)) return base;
  const results = [];
  let matched = 0;
  for (const [sim, description, updatedAt, simFull] of index.sims) {
    if (prefix && !sim.startsWith(prefix)) continue;
    const ncm = sim.slice(0, 8);
    const [context, contextFull] = index.ncms[ncm];
    const haystack = fold(context + " " + description);
    if (!terms.every(t => haystack.includes(t))) continue;
    matched++;
    if (results.length < limite) results.push({
      ncm, sim, sim_description: description, ncm_context: context,
      updated_at: updatedAt,
      description_limits: { sim_field_full: simFull, ncm_field_full: contextFull, completeness_not_guaranteed: true },
      source_uri: `pcram://${source.zip_sha256}/sim/${sim}`,
    });
  }
  return {
    source, status: matched ? "OK" : "NO_MATCH", query: { indice, prefijo, texto, limite },
    ...(ignoredTerms.length ? { normalization: { ignored_terms: ignoredTerms, terms } } : {}),
    matched_count: matched, returned_count: results.length, partial: matched > results.length,
    coverage: "Only matches of this query; no inference of tax homogeneity or product compatibility",
    results,
  };
}
