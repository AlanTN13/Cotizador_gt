// Membership guard over actual Code Tool observations, never a second classifier.
export function guardClassification(products, steps, sourceSha) {
  const consulted = new Map();
  for (const step of Array.isArray(steps) ? steps : []) {
    if (step?.action?.tool !== "Consulta_nomenclador_PCRAM") continue;
    let result;
    try {
      if (typeof step.observation !== "string") continue;
      result = JSON.parse(step.observation);
      // Agent V3 wraps one Code Tool response; unwrap exactly once, never errors/batches.
      if (Array.isArray(result)) {
        if (result.length !== 1 || !result[0] || typeof result[0] !== "object" ||
            Array.isArray(result[0]) || Object.keys(result[0]).length !== 1 ||
            typeof result[0].response !== "string") continue;
        result = JSON.parse(result[0].response);
      }
      if (!result || typeof result !== "object" || Array.isArray(result) ||
          "error" in result || "errors" in result || "response" in result) continue;
    } catch { continue; }
    const input = step.action.toolInput;
    if (result?.source?.zip_sha256 !== sourceSha || !["OK", "NO_MATCH"].includes(result.status) ||
        !Number.isInteger(result?.query?.indice) || input?.indice !== result.query.indice ||
        !Array.isArray(result.results) || result.results.some(row =>
          !row || typeof row !== "object" || Array.isArray(row) ||
          typeof row.ncm !== "string" || typeof row.sim !== "string")) continue;
    // Only complete, directed detail can substantiate precise NCM/SIM.
    // Legacy observations remain usable for estimates, never precise membership.
    if (!["indice", "prefijo", "texto", "limite", "vista"].every(k => input[k] === result.query[k]) ||
        Object.hasOwn(input, "offset") || Object.hasOwn(result.query, "offset") ||
        result.query.vista !== "detalle" || result.retrieval?.view !== "detalle" ||
        result.retrieval?.complete !== true || result.retrieval?.unit !== "SIM" ||
        result.retrieval.total !== result.matched_count || result.retrieval.returned !== result.results.length ||
        result.returned_count !== result.results.length || result.matched_count !== result.results.length ||
        result.partial !== false || result.results.length > 64) continue;
    const prefix = typeof input.prefijo === "string" ? input.prefijo.replaceAll(".", "") : "";
    // Family detail may substantiate FAMILY_SNAPSHOT, but cannot authorize NCM8/SIM.
    if (!/^(?:\d{8}|\d{11}[A-Z])$/.test(prefix)) continue;
    if (result.results.some(r => !/^\d{11}[A-Z]$/.test(r.sim) || r.ncm !== r.sim.slice(0,8) ||
        !r.sim.startsWith(prefix) || r.source_uri !== `pcram://${sourceSha}/sim/${r.sim}` ||
        typeof r.ncm_context !== "string" || !r.ncm_context ||
        typeof r.sim_description !== "string" || !r.sim_description)) continue;
    const entries = consulted.get(result.query.indice) || [];
    // A full-width source field signals possible truncation. Never repair its text.
    // Keep NCM support when its context is not flagged; do not support a flagged SIM.
    entries.push(...result.results.filter(r => r.description_limits?.ncm_field_full === false)
      .map(r => ({ ...r, sim: r.description_limits?.sim_field_full === false ? r.sim : null })));
    consulted.set(result.query.indice, entries);
  }
  const parse = value => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") return "INVALID";
    if (/^(?:\d{4}|\d{6}|\d{8}|\d{11}[A-Z])$/.test(value)) return value;
    if (/^\d{4}\.\d{2}(?:\.\d{2}(?:\.\d{3}[A-Z])?)?$/.test(value)) return value.replaceAll(".", "");
    return "INVALID";
  };
  return products.map(p => {
    const rows = consulted.get(p.indice) || [];
    const ncm = parse(p.clasificacion), sim = parse(p.SIM);
    const supportedNcm = ncm === null || (ncm !== "INVALID" &&
      (ncm.length <= 6 || rows.some(r => r.ncm === ncm || r.sim === ncm)));
    const supportedSim = sim === null || (sim !== "INVALID" && rows.some(r => r.sim === sim));
    const consistent = !sim || !ncm || (sim !== "INVALID" && ncm !== "INVALID" && sim.startsWith(ncm));
    if (supportedNcm && supportedSim && consistent) return p;
    // Do not manufacture a shorter code, change numeric DIE, or choose a replacement.
    return { ...p,
      clasificacion: supportedNcm && consistent ? p.clasificacion : null,
      SIM: supportedSim && consistent ? p.SIM : null,
      evidencia: (Array.isArray(p.evidencia) ? p.evidencia : []).filter(e => !e.url?.startsWith("pcram://")),
      fundamento: `${p.fundamento || ""} Estimación: identificador no acreditado en la consulta del producto o identificadores incompatibles; no se completó ni recortó ningún código.`,
    };
  });
}

// QA evidence boundary; never chooses a replacement code or changes a rate.
// A model claim/citation alone is not a verified product attribute.
export function auditClassification(products, steps, sourceSha, solicitud) {
  const clean = guardClassification(products, steps, sourceSha);
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const code = value => typeof value === 'string' && /^(?:\d{4}|\d{6}|\d{8}|\d{11}[A-Z])$/.test(value) ? value : null;
  const responses = [];
  for (const step of Array.isArray(steps) ? steps : []) {
    if (step?.action?.tool !== 'Consulta_nomenclador_PCRAM') continue;
    try {
      let r = JSON.parse(step.observation);
      if (Array.isArray(r)) {
        if (r.length !== 1 || Object.keys(r[0] || {}).length !== 1 || typeof r[0].response !== 'string') continue;
        r = JSON.parse(r[0].response);
      }
      const q = step.action.toolInput;
      if (!r || Array.isArray(r) || r.error || r.errors || r.response || r.source?.zip_sha256 !== sourceSha ||
          !['OK','NO_MATCH'].includes(r.status) || !Number.isInteger(r.query?.indice) ||
          !q || typeof q.prefijo !== 'string' || typeof q.texto !== 'string' || !Number.isInteger(q.limite) || q.limite<1 || q.limite>8 || !['indice','prefijo','texto','limite','vista'].every(k => q[k] === r.query[k]) ||
          Object.hasOwn(q,'offset') || Object.hasOwn(r.query,'offset') || !Array.isArray(r.results)) continue;
      responses.push(r);
    } catch { /* malformed or ambiguous observations do not substantiate QA */ }
  }
  // Only literal text associated with a real citation in a surfaced model trace.
  // Built-in Web Search is not assumed to appear as a separate ai_tool step.
  const webQuotes = [];
  for (const step of Array.isArray(steps) ? steps : []) {
    for (const message of Array.isArray(step?.action?.messageLog) ? step.action.messageLog : []) {
      for (const block of Array.isArray(message?.content) ? message.content : []) {
        if (block?.type !== 'text' || typeof block.text !== 'string') continue;
        for (const a of Array.isArray(block.annotations) ? block.annotations : []) {
          if (a?.type !== 'url_citation' || typeof a.url !== 'string' ||
              !Number.isInteger(a.start_index) || !Number.isInteger(a.end_index) ||
              a.start_index < 0 || a.end_index <= a.start_index || a.end_index > block.text.length) continue;
          webQuotes.push({indice:step?.action?.toolInput?.indice,url:a.url,text:block.text.slice(a.start_index,a.end_index)});
        }
      }
    }
  }
  const sameUrl = (a,b) => {
    try { const x=new URL(a),y=new URL(b); return x.protocol==='https:' && y.protocol==='https:' && x.href===y.href; }
    catch { return false; }
  };
  const complete = r => r?.status === 'OK' && r.query.vista === 'detalle' && r.retrieval?.view === 'detalle' &&
    r.retrieval?.complete === true && r.retrieval.unit === 'SIM' && r.partial === false &&
    r.results.length > 0 && r.results.length <= 64 && r.retrieval.total === r.matched_count &&
    r.retrieval.returned === r.results.length && r.returned_count === r.results.length && r.matched_count === r.results.length &&
    r.results.every(x => /^\d{11}[A-Z]$/.test(x?.sim) && x.ncm === x.sim.slice(0,8) &&
      x.source_uri === `pcram://${sourceSha}/sim/${x.sim}` && x.sim.startsWith(r.query.prefijo.replaceAll('.','')));
  return clean.map((p,i) => {
    const original = products[i], proof = original.verificacion;
    const input = solicitud?.productos?.[p.indice-1];
    const own = responses.filter(r => r.query.indice === p.indice);
    const callCount = (Array.isArray(steps) ? steps : []).filter(s => s?.action?.tool === 'Consulta_nomenclador_PCRAM' && s.action.toolInput?.indice === p.indice).length;
    const claims = Array.isArray(proof?.atributos) && proof.atributos.length <= 8 ? proof.atributos : [];
    const verified = claims.filter(a => {
      if (!a || typeof a.cita !== 'string' || a.cita.length < 8 || a.cita.length > 1600) return false;
      if (a.fuente === 'descripcion') return typeof input?.descripcion === 'string' && input.descripcion.includes(a.cita);
      return sameUrl(a.fuente,input?.link) && webQuotes.some(w => w.indice === p.indice && sameUrl(w.url,a.fuente) && w.text.includes(a.cita));
    });
    const facts = normalize(verified.map(a=>a.cita).join(' '));
    const selected = code(p.SIM) || code(p.clasificacion);
    const directed = callCount <= 2 && own.find(r => complete(r) && /^(?:\d{8}|\d{11}[A-Z])$/.test(r.query.prefijo.replaceAll('.','')) &&
      r.results.some(row => row.sim === selected || row.ncm === selected));
    const row = directed ? directed.results.find(row => row.sim === selected || row.ncm === selected) : null;
    // Source conditions, not generic ancestor vocabulary, determine compatibility.
    // Keep conservative literal coverage for contexts without a supported natural
    // attribute check; exceptions/ranges still cannot be certified by word overlap.
    const context = selected?.length === 12 ? row?.sim_description : row?.ncm_context;
    const stop = new Set(['de','del','la','las','el','los','y','o','a','al','en','por','para','con']);
    const terms = [...new Set(normalize(context).split(' ').filter(t=>t && !stop.has(t)))];
    const restricted = /\b(?:no|sin|excepto|salvo|superior|inferior|hasta|demas|restantes)\b|\d/.test(normalize(context));
    const fullText = !!row && row.description_limits?.ncm_field_full === false &&
      (selected?.length !== 12 || row.description_limits?.sim_field_full === false);
    // This derives the required type/material from the actual source wording,
    // never from a code/rate mapping. Only NCM context, not SIM conditions.
    const cottonTshirtContext = selected?.length === 8 &&
      /^de algodon t shirts y camisetas de punto(?: prendas y complementos accesorios de vestir de punto)?$/.test(normalize(context));
    const naturalTypeAndMaterial = cottonTshirtContext && verified.some(a => {
      const wording = normalize(a.cita);
      const typeObserved = /^(?:remeras?|camisetas?|t shirts?)\b/.test(wording);
      const compositionObserved = /\b100\s*%\s*(?:de\s+)?algodon\b/.test(a.cita.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
      return typeObserved && compositionObserved && (a.cita.match(/\d+(?:[.,]\d+)?\s*%/g) || []).length === 1;
    }) && !/\b(?:pantalon(?:es)?|tejido plano)\b/.test(normalize(input?.descripcion) + ' ' + facts);
    const grounded = verified.length > 0 && verified.length === claims.length && terms.length > 1 &&
      (naturalTypeAndMaterial || terms.every(t => facts.split(' ').includes(t))) && !restricted;
    const contradictory = /\b(?:no|sin|desconocid|inciert|estimad|probab|supuest|falta|incomplet)/.test(normalize(input?.descripcion) + ' ' + facts) ||
      (typeof proof?.motivo_aproximacion === 'string' && proof.motivo_aproximacion.trim().length > 0);
    const exact = !!selected && selected.length >= 8 && !!directed && fullText && grounded && !contradictory;
    let result = p, reason = '';
    if (!exact && selected?.length >= 8) {
      result = {...p,clasificacion:null,SIM:null,
        evidencia:(Array.isArray(p.evidencia)?p.evidencia:[]).filter(e=>!e.url?.startsWith('pcram://'))};
      reason = 'Atributos del producto no acreditan todas las condiciones disponibles de la posición específica.';
    }
    // Preserve only an explicit family supplied by the agent and corroborated by
    // complete PCRAM detail. Never truncate the rejected precise candidate.
    const family = code(proof?.familia_sustentada);
    const familyQuery = callCount <= 2 && family?.length <= 6 && own.find(r => complete(r) && r.query.prefijo.replaceAll('.','') === family);
    if (!exact && !result.clasificacion && familyQuery) result = {...result,clasificacion:family,SIM:null};
    if (!exact && !reason) reason = !own.length ? 'Sin consulta PCRAM acreditada para este producto.' :
      own.every(r=>r.status==='NO_MATCH') ? 'El código consultado no aparece en PCRAM.' :
      !fullText && selected?.length >= 8 ? 'Fuente incompleta o posición específica no acreditada.' :
      proof?.motivo_aproximacion || 'Clasificación parcial: no se verificaron todos los atributos discriminantes.';
    if (!exact && result !== p) result = {...result,fundamento:`${result.fundamento || ''} Aproximación QA: ${reason}`};
    // The model never supplies this computed QA verdict. Taxes remain separate.
    const {verificacion:ignored,...publicProduct} = result;
    return {...publicProduct,clasificacion_qa:{
      nivel:exact?'COINCIDENCIA_EXACTA':'COINCIDENCIA_APROXIMADA',
      candidato:code(proof?.codigo_candidato) || code(original.SIM) || code(original.clasificacion),
      codigo_validado:code(result.SIM) || code(result.clasificacion),motivo:reason,
      atributos_verificados:verified.map(a=>({fuente:a.fuente,cita:a.cita})),
      consultas:own.map(r=>({query:r.query,status:r.status,complete:r.retrieval?.complete===true,
        matched_count:r.matched_count,returned_count:r.returned_count,source_sha256:r.source.zip_sha256})),
      source_sha256:sourceSha,verificador:'literal-product-evidence-v1',
    }};
  });
}
