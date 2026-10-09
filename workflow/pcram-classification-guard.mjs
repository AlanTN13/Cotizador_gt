// Membership guard over actual Code Tool observations, never a second classifier.
export function guardClassification(products, steps, sourceSha) {
  const consulted = new Map();
  for (const step of Array.isArray(steps) ? steps : []) {
    if (step?.action?.tool !== "Consulta_nomenclador_PCRAM") continue;
    let result;
    try { result = JSON.parse(step.observation); } catch { continue; }
    const input = step.action.toolInput;
    if (result?.source?.zip_sha256 !== sourceSha || !["OK", "NO_MATCH"].includes(result.status) ||
        !Number.isInteger(result?.query?.indice) || input?.indice !== result.query.indice ||
        !Array.isArray(result.results)) continue;
    const entries = consulted.get(result.query.indice) || [];
    entries.push(...result.results);
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
