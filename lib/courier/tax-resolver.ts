import dieTeData from "../../data/tax-die-te.json";
import estimationPolicy from "../../data/tax-estimation-policy.json";
import vatData from "../../data/tax-vat.json";

export const TAX_RESOLVER_VERSION = "tax-resolver-1.1.0";
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
  status: "RESUELTO" | "ESTIMADO" | "REQUIERE_REVISION";
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
  warnings: string[];
  estimation: {
    policyVersion: string;
    components: { tax: "duty" | "statistical" | "vat"; method: string; source: string; basis: string }[];
  };
};
export type ProfileTaxEstimate = {
  position: string;
  duty: number | null;
  statistical?: number | null;
  vat?: number | null;
  profileId: string;
  catalogVersion: string;
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
function usable(source: TaxSource, now: Date) {
  return source.id && source.document && /^[a-f0-9]{64}$/.test(source.sha256) &&
    Number.isFinite(Date.parse(source.reviewAfter)) &&
    Date.parse(source.capturedAt) <= +now;
}
export function resolveTaxes(
  input: string | null,
  productIndex: number,
  now = new Date(),
  data: TaxDataset = taxDataset,
  profileEstimate?: ProfileTaxEstimate,
): TaxResolution {
  const position = normalizePosition(input);
  const result: TaxResolution = {
    productIndex, status: "REQUIERE_REVISION", requestedPosition: input,
    ncm: position?.slice(0, 8) ?? null,
    sim: position && simPattern.test(position) ? position : null,
    resolverVersion: TAX_RESOLVER_VERSION, scope: TAX_SCOPE,
    excludedConcepts: ["IVA_ADICIONAL_PERCEPCION", "GANANCIAS", "IMPUESTOS_INTERNOS"],
    rates: { duty: null, statistical: null, vat: null },
    dutyEvidence: null, vatEvidence: null, reasons: [], warnings: [],
    estimation: { policyVersion: estimationPolicy.version, components: [] },
  };
  const usableProfile = profileEstimate && normalizePosition(profileEstimate.position) === position &&
    profileEstimate.profileId && profileEstimate.catalogVersion ? profileEstimate : undefined;
  const profileSource = usableProfile ? usableProfile.catalogVersion + ":" + usableProfile.profileId : "";
  const estimate = (tax: "duty" | "statistical" | "vat", method: string, source: string, basis: string) => {
    result.estimation.components.push({ tax, method, source, basis });
  };
  if (!position) { result.reasons.push("POSITION_INVALID"); return result; }
  if (!data.duty.version || !data.vat.version || !usable(data.duty.source, now) || !usable(data.vat.source, now)) {
    result.reasons.push("TAX_SOURCE_INVALID"); return result;
  }
  if (Object.keys(data.duty.rows).length !== data.duty.rowCount) {
    result.reasons.push("TAX_DATASET_INCOMPLETE"); return result;
  }
  const dutyReviewDue = +now >= Date.parse(data.duty.source.reviewAfter);
  const vatReviewDue = +now >= Date.parse(data.vat.source.reviewAfter);
  // The review deadline is maintenance metadata, NOT legal expiry. Retain
  // known specific treatment instead of replacing it with a higher default.
  if (dutyReviewDue || vatReviewDue) result.warnings.push("TAX_SOURCE_REVIEW_DUE");
  const ncmMatches = () => Object.entries(data.duty.rows).filter(([sim]) => sim.slice(0, 8) === result.ncm);
  const exact = result.sim ? data.duty.rows[position] : undefined;
  const matches: [string, DutyRow][] = exact ? [[position, exact]] : ncmMatches();
  if (result.sim && !exact && matches.length) {
    result.warnings.push("SIM_UNVERIFIED_NCM_ESTIMATE");
    for (const tax of ["duty", "statistical"] as const)
      estimate(tax, "NCM_UNANIMOUS", data.duty.version, "SIM no encontrado; tratamiento homogéneo de la NCM probable.");
  }
  if (matches.length) {
    const first = matches[0][1];
    result.dutyEvidence = {
      version: data.duty.version, source: data.duty.source, matchedSimCount: matches.length,
      rows: matches.slice(0, 10).map(([sim, row]) => ({ sim, page: row.page })),
    };
    if (matches.some(([, row]) => !validRate(row.duty) || !validRate(row.statistical) ||
        row.duty !== first.duty || row.statistical !== first.statistical)) {
      result.reasons.push("DIE_TE_AMBIGUOUS_OR_INVALID"); return result;
    }
    result.rates.duty = first.duty;
    result.rates.statistical = first.statistical;
  } else {
    // No universal DIE: the only last-resort estimate is a same-position
    // rate already supplied by the server-side profile, with provenance.
    if (!usableProfile || usableProfile.duty === null || !validRate(usableProfile.duty)) {
      result.reasons.push("NO_MINIMUM_TAX_BASIS"); return result;
    }
    const general = estimationPolicy.generalStatistical;
    const profileTe = usableProfile.statistical;
    if (profileTe != null && !validRate(profileTe)) {
      result.reasons.push("PROFILE_RATE_INVALID"); return result;
    }
    if (profileTe == null && (+now < Date.parse(general.validFrom) || +now >= Date.parse(general.validUntil))) {
      result.reasons.push("GENERAL_TE_OUTSIDE_LEGAL_PERIOD"); return result;
    }
    result.rates.duty = usableProfile.duty;
    result.rates.statistical = profileTe ?? general.rate;
    result.warnings.push("PROFILE_DUTY_ESTIMATE", profileTe != null ? "PROFILE_TE_ESTIMATE" : "GENERAL_TE_ESTIMATE");
    estimate("duty", "PROFILE_RATE", profileSource,
      "DIE de referencia del perfil para la misma posición probable; sin coincidencia en snapshot.");
    estimate("statistical", profileTe != null ? "PROFILE_RATE" : "GENERAL_RULE",
      profileTe != null ? profileSource : general.source,
      profileTe != null ? "TE específica del perfil para la misma posición probable." : general.basis);
  }
  // Resolve the requested position too, so a known exact exception cannot
  // disappear when the SIM is absent from the DIE/TE snapshot.
  const vatPositions = exact || !result.sim ? matches.map(([sim]) => sim) : [position, ...matches.map(([sim]) => sim)];
  if (!vatPositions.length) vatPositions.push(position);
  const selected: VatRule[] = [];
  for (const sim of vatPositions) {
    const specific = data.vat.rules.filter((rule) => rule.position === sim);
    const rules = specific.length ? specific : data.vat.rules.filter((rule) => rule.position === sim.slice(0, 8));
    if (rules.some((rule) => !validRate(rule.vat) || !rule.basis || !rule.sourceIds.length ||
        rule.sourceIds.some((id) => !data.vat.sources.some((source) => source.id === id && source.url && source.locator)))) {
      result.reasons.push("VAT_RULE_INVALID"); return result;
    }
    if (rules.some((rule) => rule.vat !== rules[0].vat)) {
      result.reasons.push("VAT_AMBIGUOUS"); return result;
    }
    if (rules.length > 1) result.warnings.push("VAT_EQUIVALENT_RULES");
    if (rules.length) selected.push(rules[0]);
    else if (usableProfile?.vat != null) {
      if (!validRate(usableProfile.vat)) {
        result.reasons.push("PROFILE_RATE_INVALID"); return result;
      }
      selected.push({ id: "profile-vat-estimate", position: sim, vat: usableProfile.vat,
        basis: "IVA específico disponible en el perfil para la misma posición probable.",
        description: "Estimación del perfil", sourceIds: [] });
    } else {
      const general = estimationPolicy.generalVat;
      if (+now < Date.parse(general.validFrom)) {
        result.reasons.push("GENERAL_VAT_NOT_AVAILABLE"); return result;
      }
      selected.push({ id: "general-vat-estimate", position: sim, vat: general.rate,
        basis: general.basis, description: "Estimación con alícuota general; no excluye tratamientos especiales.", sourceIds: [] });
    }
  }
  if (selected.some((rule) => rule.vat !== selected[0].vat)) {
    result.reasons.push("VAT_AMBIGUOUS"); return result;
  }
  if (selected.some((rule) => rule.id === "general-vat-estimate")) {
    result.warnings.push("GENERAL_VAT_ESTIMATE");
    estimate("vat", "GENERAL_RULE", estimationPolicy.generalVat.source, estimationPolicy.generalVat.basis);
  }
  if (selected.some((rule) => rule.id === "profile-vat-estimate")) {
    result.warnings.push("PROFILE_VAT_ESTIMATE");
    estimate("vat", "PROFILE_RATE", profileSource, "IVA específico disponible en el perfil para la misma posición probable.");
  }
  const rules = [...new Map(selected.filter((r) => !["general-vat-estimate", "profile-vat-estimate"].includes(r.id)).map((rule) => [rule.id, rule])).values()];
  if (rules.length) result.vatEvidence = {
    version: data.vat.version, source: data.vat.source, rules,
    sources: data.vat.sources.filter((source) => rules.some((rule) => rule.sourceIds.includes(source.id))),
  };
  result.rates.vat = selected[0].vat;
  result.warnings = [...new Set(result.warnings)];
  result.status = result.warnings.length ? "ESTIMADO" : "RESUELTO";
  return result;
}
