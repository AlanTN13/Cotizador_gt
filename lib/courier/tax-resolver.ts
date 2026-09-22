import dieTeData from "../../data/tax-die-te.json";
import vatData from "../../data/tax-vat.json";

export const TAX_RESOLVER_VERSION = "tax-resolver-1.0.0";
export const TAX_SCOPE = "DIE_TE_IVA_REFERENCIAL_V1";
export type TaxSource = {
  id: string;
  document: string;
  sha256: string;
  capturedAt: string;
  reviewAfter: string;
  effectiveDate: string | null;
  note: string;
};
export type DutyRow = { duty: number; statistical: number; page: number };
export type VatRule = {
  id: string;
  position: string;
  vat: number;
  basis: string;
  description: string;
  sourceIds: string[];
};
export type TaxDataset = {
  duty: { version: string; source: TaxSource; rowCount: number; rows: Record<string, DutyRow> };
  vat: { version: string; source: TaxSource; sources: { id: string; url: string; locator: string }[]; rules: VatRule[] };
};
export type TaxResolution = {
  productIndex: number;
  status: "RESUELTO" | "REQUIERE_REVISION";
  requestedPosition: string | null;
  ncm: string | null;
  sim: string | null;
  resolverVersion: string;
  scope: typeof TAX_SCOPE;
  excludedConcepts: string[];
  rates: { duty: number | null; statistical: number | null; vat: number | null };
  dutyEvidence: { version: string; source: TaxSource; matchedSimCount: number; rows: { sim: string; page: number }[] } | null;
  vatEvidence: { version: string; source: TaxSource; rules: VatRule[]; sources: TaxDataset["vat"]["sources"] } | null;
  reasons: string[];
};
export const taxDataset: TaxDataset = { duty: dieTeData, vat: vatData };
const ncmPattern = /^\d{8}$/;
const simPattern = /^\d{11}[A-Z]$/;
export function normalizePosition(input: string | null): string | null {
  if (!input) return null;
  // Only recognised separators; never truncate an unknown suffix or SIM letter.
  const position = input.trim().toUpperCase().replace(/[.\s]/g, "");
  return ncmPattern.test(position) || simPattern.test(position) ? position : null;
}
const validRate = (rate: number) => Number.isFinite(rate) && rate >= 0 && rate <= 1;
function fresh(source: TaxSource, now: Date) {
  return source.id && source.document && /^[a-f0-9]{64}$/.test(source.sha256) &&
    Date.parse(source.capturedAt) <= +now && +now < Date.parse(source.reviewAfter);
}
export function resolveTaxes(
  input: string | null,
  productIndex: number,
  now = new Date(),
  data: TaxDataset = taxDataset,
): TaxResolution {
  const position = normalizePosition(input);
  const result: TaxResolution = {
    productIndex, status: "REQUIERE_REVISION", requestedPosition: input,
    ncm: position?.slice(0, 8) ?? null,
    sim: position && simPattern.test(position) ? position : null,
    resolverVersion: TAX_RESOLVER_VERSION, scope: TAX_SCOPE,
    excludedConcepts: ["IVA_ADICIONAL_PERCEPCION", "GANANCIAS", "IMPUESTOS_INTERNOS"],
    rates: { duty: null, statistical: null, vat: null },
    dutyEvidence: null, vatEvidence: null, reasons: [],
  };
  if (!position) { result.reasons.push("POSITION_INVALID"); return result; }
  if (!data.duty.version || !data.vat.version || !fresh(data.duty.source, now) || !fresh(data.vat.source, now)) {
    result.reasons.push("TAX_SOURCE_REVIEW_DUE"); return result;
  }
  if (Object.keys(data.duty.rows).length !== data.duty.rowCount) {
    result.reasons.push("TAX_DATASET_INCOMPLETE"); return result;
  }
  // A full unknown SIM must never fall back to its NCM. NCM-only queries
  // require complete, unanimous treatment across ALL children in the snapshot.
  const matches: [string, DutyRow][] = result.sim
    ? data.duty.rows[position] ? [[position, data.duty.rows[position]]] : []
    : Object.entries(data.duty.rows).filter(([sim]) => sim.slice(0, 8) === position);
  if (!matches.length) { result.reasons.push("POSITION_NOT_FOUND"); return result; }
  const first = matches[0][1];
  result.dutyEvidence = {
    version: data.duty.version, source: data.duty.source, matchedSimCount: matches.length,
    // At most ten rows in the receipt; count/coverage is verified below and
    // the full snapshot is addressed by version/hash. Avoid registry overflow.
    rows: matches.slice(0, 10).map(([sim, row]) => ({ sim, page: row.page })),
  };
  if (matches.some(([, row]) => !validRate(row.duty) || !validRate(row.statistical) ||
      row.duty !== first.duty || row.statistical !== first.statistical)) {
    result.reasons.push("DIE_TE_AMBIGUOUS_OR_INVALID"); return result;
  }
  result.rates.duty = first.duty;
  result.rates.statistical = first.statistical;
  const selected: VatRule[] = [];
  for (const [sim] of matches) {
    const exact = data.vat.rules.filter((rule) => rule.position === sim);
    const rules = exact.length ? exact : data.vat.rules.filter((rule) => rule.position === sim.slice(0, 8));
    // Multiple equally specific rules indicate ambiguous configuration,
    // including duplicate rules with identical numbers.
    if (rules.length !== 1) {
      result.reasons.push(rules.length ? "VAT_AMBIGUOUS" : "VAT_NOT_COVERED"); return result;
    }
    const rule = rules[0];
    if (!validRate(rule.vat) || !rule.basis || !rule.sourceIds.length ||
        rule.sourceIds.some((id) => !data.vat.sources.some((source) => source.id === id && source.url && source.locator))) {
      result.reasons.push("VAT_RULE_INVALID"); return result;
    }
    selected.push(rule);
  }
  if (selected.some((rule) => rule.vat !== selected[0].vat)) {
    result.reasons.push("VAT_AMBIGUOUS"); return result;
  }
  const rules = [...new Map(selected.map((rule) => [rule.id, rule])).values()];
  result.vatEvidence = {
    version: data.vat.version, source: data.vat.source, rules,
    sources: data.vat.sources.filter((source) => rules.some((rule) => rule.sourceIds.includes(source.id))),
  };
  result.rates.vat = selected[0].vat;
  result.status = "RESUELTO";
  return result;
}
