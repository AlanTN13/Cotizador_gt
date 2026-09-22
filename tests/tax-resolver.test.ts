import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import vatData from "../data/tax-vat.json";
import { resolveTaxes, taxDataset, normalizePosition } from "../lib/courier/tax-resolver";
import { decide } from "../lib/courier/engine";
import { getCatalog, referenceCatalog } from "../lib/courier/catalog";
import { submit } from "../lib/courier/service";
import type { Catalog, Interpretation, Submission, Registry, Result } from "../lib/courier/types";
const now = new Date("2026-09-22T12:00:00Z");
// Independently transcribed PDF cells; AEC is deliberately NOT DIE.
const cases = [
  ["Ventilador de pie", "84145190100R", .20, .03, .21, 1275],
  ["T-shirt algodón (AEC 35, DIE 20)", "61091000190Z", .20, .03, .21, 0],
  ["Cuchara inoxidable", "82159910130F", .18, .03, .21, 1249],
  ["Lámpara LED", "85395200900Z", .20, .03, .21, 1457],
  ["Taza gres", "69120000191F", .20, .03, .21, 0],
  ["Notebook >600 y <=1100 USD", "84713012991G", .16, 0, .105, 1367],
  ["Router inalámbrico <10 puertos", "85176241100N", 0, 0, .105, 1424],
] as const;
function fixture(sims: string[]): { s: Submission; c: Catalog; interpretations: Interpretation[] } {
  const c = structuredClone(referenceCatalog);
  c.scope = "operational";
  c.tariff!.approval!.approvedBy = "Germán Jiménez";
  c.profiles = sims.map((sim, i) => ({ ...structuredClone(c.profiles[0]),
    id: `fixture-${i}`, name: `Fixture ${i}`, sim,
    approval: { ...c.profiles[0].approval!, approvedBy: "Germán Jiménez" },
    // Historical DIE sentinel: specific sources must replace it.
    taxes: { duty: .99, statistical: null, vat: null, additionalVat: null, income: null, internal: null },
  }));
  const s: Submission = {
    requestId: "adea80a0-7227-4ba1-af39-273c4963cb06",
    products: sims.map(() => ({ description: "Fixture", url: "", quantity: 1, valueUsd: 100, origin: "China", attributes: {} })),
    parcels: [{ quantity: 1, width: 10, height: 10, length: 10, grossWeight: 2 }],
    contact: { name: "QA", email: "qa@example.com" }, route: "CN-BUE", condition: "new", purpose: "commercial", reference: false, website: "",
  };
  const interpretations = sims.map((_, productIndex) => ({ productIndex, name: "Fixture", candidateIds: [`fixture-${productIndex}`], attributes: {}, missing: [], evidence: [], issue: null }));
  return { s, c, interpretations };
}
describe("supplied snapshot and 9 representative cases", () => {
  it.each(cases)("%s resolves DIE/TE/IVA with source/version", (_, sim, duty, statistical, vat, page) => {
    const r = resolveTaxes(sim, 0, now);
    expect(r.status).toBe("RESUELTO");
    expect(r.rates).toEqual({ duty, statistical, vat });
    expect(r.sim).toBe(sim); expect(r.ncm).toBe(sim.slice(0, 8));
    if (page) expect(r.dutyEvidence!.rows[0].page).toBe(page);
    expect(r.dutyEvidence!.source.sha256).toHaveLength(64);
    expect(r.vatEvidence!.version).toBe("iva-importacion-2026-09-22-v1");
    expect(r.vatEvidence!.rules[0].sourceIds.length).toBeGreaterThan(0);
  });
  it("smartwatch without a unique supported classification requires review", () => {
    const { s, c, interpretations } = fixture(["85176241100N"]);
    s.products[0].description = "Smartwatch";
    interpretations[0].candidateIds = ["fixture-0", "uncertain-smartwatch"];
    const r = decide(s, c, interpretations, now);
    expect(r).toMatchObject({ status: "REQUIERE_REVISION", calculation: null });
    expect(r.taxResolutions![0].rates).toEqual({ duty: null, statistical: null, vat: null });
    expect(r.reasons[0].code).toBe("CLASSIFICATION_REVIEW");
  });
  it("uncurated smartphone IVA uses the disclosed general estimate", () => {
    const r = resolveTaxes("85171300000C", 0, now);
    expect(r.status).toBe("ESTIMADO");
    expect(r.rates).toEqual({ duty: .08, statistical: 0, vat: .21 });
    expect(r.warnings).toContain("GENERAL_VAT_ESTIMATE");
    expect(r.estimation.components[0]).toMatchObject({ tax: "vat", method: "GENERAL_RULE" });
  });
  it("IVA rules and cached official annex retain their content hashes", () => {
    const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) :
      value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : 1).map(([key, v]) => [key, canonical(v)])) : value;
    const rulesHash = createHash("sha256").update(JSON.stringify(canonical({ sources: vatData.sources, rules: vatData.rules }))).digest("hex");
    expect(rulesHash).toBe(vatData.source.sha256);
    const annex = vatData.sources.find((s) => s.document)!;
    expect(createHash("sha256").update(readFileSync(annex.document!)).digest("hex")).toBe(annex.sha256);
  });
  it("source hash, full row count, and independent TE count match PDF", () => {
    const hash = createHash("sha256").update(readFileSync("data/tax-sources/ncmsim.pdf")).digest("hex");
    expect(hash).toBe(taxDataset.duty.source.sha256);
    expect(Object.keys(taxDataset.duty.rows)).toHaveLength(32978);
    expect(Object.values(taxDataset.duty.rows).filter((r) => r.statistical === 0)).toHaveLength(3337);
  });
});
describe("fail-closed and specificity", () => {
  it("normalizes formatting without truncating codes", () => {
    expect(normalizePosition(" 8517.62.41.100n ")).toBe("85176241100N");
    expect(normalizePosition("85176241100N garbage")).toBeNull();
    const estimated = resolveTaxes("85176241100X", 0, now);
    expect(estimated.status).toBe("ESTIMADO");
    expect(estimated.warnings).toContain("SIM_UNVERIFIED_NCM_ESTIMATE");
    expect(estimated.rates).toEqual({ duty: 0, statistical: 0, vat: .105 });
  });
  it("NCM requires unanimous DIE/TE and explicit IVA for all SIM children", () => {
    expect(resolveTaxes("8517.62.41", 0, now).rates).toEqual({ duty: 0, statistical: 0, vat: .105 });
    const d = structuredClone(taxDataset);
    d.duty.rows["85176241900G"].duty = .1;
    expect(resolveTaxes("85176241", 0, now, d).reasons).toContain("DIE_TE_AMBIGUOUS_OR_INVALID");
  });
  it("an exact IVA rule takes precedence over the broader NCM", () => {
    const d = structuredClone(taxDataset);
    d.vat.rules.push({ ...d.vat.rules[6], id: "test-specific", position: "85176241100N", vat: .21 });
    expect(resolveTaxes("85176241100N", 0, now, d).rates.vat).toBe(.21);
    expect(resolveTaxes("85176241", 0, now, d).reasons).toContain("VAT_AMBIGUOUS");
  });
  it("an incomplete snapshot cannot claim unanimous NCM coverage", () => {
    const d = structuredClone(taxDataset); delete d.duty.rows["85176241900G"];
    expect(resolveTaxes("85176241", 0, now, d).reasons).toEqual(["TAX_DATASET_INCOMPLETE"]);
  });
  it("conflicting rules cannot fall back to NCM", () => {
    const d = structuredClone(taxDataset);
    d.vat.rules.push({ ...d.vat.rules[0], vat: .105 });
    expect(resolveTaxes("84145190100R", 0, now, d).reasons).toEqual(["VAT_AMBIGUOUS"]);
  });
  it.each([NaN, Infinity, -1, 1.1])("invalid rate %s fails closed", (value) => {
    const d = structuredClone(taxDataset); d.duty.rows["84145190100R"].statistical = value;
    expect(resolveTaxes("84145190100R", 0, now, d).status).toBe("REQUIERE_REVISION");
  });
  it.each(["2026-09-21", "invalid"])("invalid/outside review window %s", (date) => {
    expect(resolveTaxes("84145190100R", 0, new Date(date)).status).toBe("REQUIERE_REVISION");
  });
  it("missing source provenance never quotes", () => {
    const d = structuredClone(taxDataset); d.vat.rules[0].sourceIds = ["invented"];
    expect(resolveTaxes("84145190100R", 0, now, d).reasons).toEqual(["VAT_RULE_INVALID"]);
  });
});
describe("post-classification integration and preserved gates", () => {
  it("multiproduct mixed rates use independent cent-checked bases and taxes", () => {
    const { s, c, interpretations } = fixture(["82159910130F", "85176241100N"]);
    for (const p of c.profiles) { p.taxes.statistical = .99; p.taxes.vat = .99; }
    const r = decide(s, c, interpretations, now);
    expect(r.status).toBe("COTIZADO");
    // CIF=110 each; spoon:19.80+3.30+27.95; router:0+0+11.55.
    expect(r.calculation!.lines.map((l) => [l.dutyUsd, l.statisticalUsd, l.vatUsd])).toEqual([[19.8, 3.3, 27.95], [0, 0, 11.55]]);
    expect(r.calculation!.taxesUsd).toBe(62.6);
    expect(r.calculation!.totalServiceUsd).toBe(143.1);
    expect(r.calculation!.lines.map((l) => l.taxRates!.vat)).toEqual([.21, .105]);
    expect(r.taxScope).toBe("DIE_TE_IVA_REFERENCIAL_V1");
    expect(c.profiles[0].taxes.duty).toBe(.99); // no catalog mutation
  });
  it("zero TE remains zero when the shipment cap binds for another line", () => {
    const { s, c, interpretations } = fixture(["82159910130F", "85176241100N"]);
    c.tariff!.statisticalCapUsd = 1;
    expect(decide(s, c, interpretations, now).calculation!.lines.map((l) => l.statisticalUsd)).toEqual([1, 0]);
  });
  it.each(["additionalVat", "income", "internal"] as const)("known %s is explicitly excluded without blocking the approved estimate", (key) => {
    const { s, c, interpretations } = fixture(["84145190100R"]); c.profiles[0].taxes[key] = .01;
    const result = decide(s, c, interpretations, now);
    expect(result.status).toBe("COTIZADO");
    expect(result.warnings!.some((r) => r.code === "OUT_OF_SCOPE_TAX_EXCLUDED")).toBe(true);
    expect(result.calculation!.lines[0]).toMatchObject({ additionalVatUsd: 0, incomeUsd: 0 });
  });
  it("multiproduct completes when one line uses the general IVA estimate", () => {
    const { s, c, interpretations } = fixture(["82159910130F", "85171300000C"]);
    const result = decide(s, c, interpretations, now);
    expect(result.status).toBe("COTIZADO");
    expect(result.calculation!.taxesUsd).toBe(84.8);
    expect(result.calculation!.totalServiceUsd).toBe(165.3);
    expect(result.warnings!.some((w) => w.productIndex === 1 && w.message.includes("IVA 21%"))).toBe(true);
  });
  it("tax evidence survives unapproved operational profiles and missing tariff", () => {
    const c = getCatalog(false), { s, interpretations } = fixture([c.profiles[0].sim!]);
    s.products[0].attributes = { ...c.profiles[0].required }; interpretations[0].candidateIds = [c.profiles[0].id];
    const r = decide(s, c, interpretations, now);
    expect(r.calculation).toBeNull(); expect(r.taxResolutions![0].status).toBe("RESUELTO");
    expect(r.reasons.map((r) => r.code)).toEqual(expect.arrayContaining(["PRODUCT_REVIEW", "TARIFF_NOT_APPROVED"]));
  });
  it("required attributes still block inference and tax lookup", () => {
    const { s, c, interpretations } = fixture(["85176241100N"]); c.profiles[0].required = { ports: "<10" };
    const r = decide(s, c, interpretations, now);
    expect(r.calculation).toBeNull(); expect(r.taxResolutions![0].status).toBe("REQUIERE_REVISION");
    expect(r.requestedAttributes).toEqual([{ productIndex: 0, key: "ports" }]);
  });
  it("request replay returns the original tax versions even after expiry", async () => {
    const { s, c, interpretations } = fixture(["85176241100N"]);
    let saved: Result | null = null;
    const registry: Registry = { get: async () => saved, commit: async (r) => saved = { ...r.result, recorded: true } };
    const interpret = vi.fn(async () => interpretations);
    const first = await submit(s, { catalog: c, registry, interpret, now });
    const replay = await submit(s, { catalog: c, registry, interpret, now: new Date("2027-01-01") });
    expect(replay).toEqual(first); expect(interpret).toHaveBeenCalledTimes(1);
    expect(replay.taxResolutions![0].vatEvidence!.version).toBe(taxDataset.vat.version);
  });
  it("10 products with complete trace fit the existing registry result cell", () => {
    const { s, c, interpretations } = fixture(Array(10).fill("85176241100N"));
    const r = decide(s, c, interpretations, now);
    expect(r.status).toBe("COTIZADO"); expect(JSON.stringify(r).length).toBeLessThan(45000);
  });
});

describe("approved estimation policy", () => {
  it("maintenance expiry preserves specific zeros/reduced rates with a warning and a usable quote expiry", () => {
    const later = new Date("2026-10-23T12:00:00Z");
    const { s, c, interpretations } = fixture(["85176241100N"]);
    const r = decide(s, c, interpretations, later);
    expect(r.status).toBe("COTIZADO");
    expect(r.taxResolutions![0]).toMatchObject({ status: "ESTIMADO", rates: { duty: 0, statistical: 0, vat: .105 } });
    expect(r.taxResolutions![0].warnings).toContain("TAX_SOURCE_REVIEW_DUE");
    expect(Date.parse(r.calculation!.expiresAt)).toBeGreaterThan(+later);
  });
  it("formal profile sign-off is not required for a reasonable estimate with known Courier eligibility", () => {
    const { s, c, interpretations } = fixture(["85176241100N"]); c.profiles[0].approval = null;
    const r = decide(s, c, interpretations, now);
    expect(r.status).toBe("COTIZADO");
    expect(r.warnings!.some((w) => w.code === "PROFILE_REFERENCE")).toBe(true);
  });
  it("missing or differing accessory data does not block a minimum reasonable classification", () => {
    const { s, c, interpretations } = fixture(["61091000190Z"]);
    c.profiles[0].required = { composicion: "algodón", talle: "M" };
    c.profiles[0].optionalForEstimate = ["talle"];
    interpretations[0].attributes = { composicion: "algodón" };
    interpretations[0].missing = ["talle"];
    expect(decide(s, c, interpretations, now).status).toBe("COTIZADO");
    s.products[0].attributes = { talle: "L" };
    const r = decide(s, c, interpretations, now);
    expect(r.status).toBe("COTIZADO");
    expect(r.warnings!.some((w) => w.code === "MINOR_CLASSIFICATION_UNCERTAINTY")).toBe(true);
    // User declarations cannot be replaced by inferred contradictory material.
    s.products[0].attributes.composicion = "poliéster";
    const conflict = decide(s, c, interpretations, now);
    expect(conflict.calculation).toBeNull();
    expect(conflict.reasons[0].code).toBe("CLASSIFICATION_CONTRADICTION");
  });
  it("complete classification evidence need not be re-entered as exact attribute fields", () => {
    const { s, c, interpretations } = fixture(["84145190100R"]);
    c.profiles[0].required = { motor: "50 W", tipo: "ventilador de pie" };
    interpretations[0].evidence = ["Ventilador de pie con motor de 50 W"];
    expect(decide(s, c, interpretations, now).status).toBe("COTIZADO");
    interpretations[0].missing = ["motor"];
    expect(decide(s, c, interpretations, now).status).toBe("REQUIERE_REVISION");
    interpretations[0].missing = [];
    s.products[0].attributes = { motor: "50W", tipo: "Ventilador DE PIE" };
    expect(decide(s, c, interpretations, now).status).toBe("COTIZADO");
  });
  it("equivalent candidate variants do not demand exact SIM certainty", () => {
    const { s, c, interpretations } = fixture(["85176241100N"]);
    c.profiles.push({ ...structuredClone(c.profiles[0]), id: "other", sim: "85176241900G" });
    interpretations[0].candidateIds.push("other");
    const r = decide(s, c, interpretations, now);
    expect(r.status).toBe("COTIZADO");
    expect(r.warnings!.some((w) => w.code === "EQUIVALENT_CLASSIFICATIONS")).toBe(true);
    c.profiles[1].sim = "84145190100R";
    expect(decide(s, c, interpretations, now).status).toBe("REQUIERE_REVISION");
  });
  it("unknown or impeded Courier eligibility still blocks the estimate", () => {
    const { s, c, interpretations } = fixture(["85176241100N"]);
    c.profiles[0].decision = "review";
    expect(decide(s, c, interpretations, now).status).toBe("REQUIERE_REVISION");
    c.profiles[0].decision = "denied";
    expect(decide(s, c, interpretations, now).status).toBe("NO_APTO_COURIER");
  });
  it("a same-position profile DIE can estimate missing snapshot data, with no universal20", () => {
    const hint = { position: "99999999", duty: .12, profileId: "fixture", catalogVersion: "fixture-version" };
    const r = resolveTaxes(hint.position, 0, now, taxDataset, hint);
    expect(r.status).toBe("ESTIMADO");
    expect(r.rates).toEqual({ duty: .12, statistical: .03, vat: .21 });
    expect(r.estimation.components.map((c) => c.tax)).toEqual(["duty", "statistical", "vat"]);
    expect(resolveTaxes(hint.position, 0, now).status).toBe("REQUIERE_REVISION");
    expect(resolveTaxes(hint.position, 0, now, taxDataset, { ...hint, position: "99999998" }).status).toBe("REQUIERE_REVISION");
    expect(resolveTaxes(hint.position, 0, now, taxDataset, { ...hint, duty: 0 }).rates.duty).toBe(0);
    const specificProfile = resolveTaxes(hint.position, 0, now, taxDataset, { ...hint, statistical: 0, vat: .105 });
    expect(specificProfile.rates).toEqual({ duty: .12, statistical: 0, vat: .105 });
    expect(specificProfile.warnings).not.toContain("GENERAL_TE_ESTIMATE");
    expect(specificProfile.warnings).not.toContain("GENERAL_VAT_ESTIMATE");
    expect(resolveTaxes(hint.position, 0, new Date("2028-01-01"), taxDataset, hint).reasons).toContain("GENERAL_TE_OUTSIDE_LEGAL_PERIOD");
  });
  it("an exact IVA exception is not hidden by the missing SIM fallback", () => {
    const d = structuredClone(taxDataset);
    d.vat.rules.push({ ...d.vat.rules[6], id: "specific", position: "85176241100X", vat: .21 });
    expect(resolveTaxes("85176241100X", 0, now, d).reasons).toContain("VAT_AMBIGUOUS");
  });
  it("equivalent duplicate IVA evidence is uncertainty, differing evidence remains material", () => {
    const d = structuredClone(taxDataset);
    d.vat.rules.push({ ...d.vat.rules[0], id: "equivalent" });
    expect(resolveTaxes("84145190100R", 0, now, d).status).toBe("ESTIMADO");
    d.vat.rules[d.vat.rules.length - 1].vat = .105;
    expect(resolveTaxes("84145190100R", 0, now, d).reasons).toContain("VAT_AMBIGUOUS");
  });
  it("an estimated receipt remains immutable on replay", async () => {
    const { s, c, interpretations } = fixture(["85171300000C"]);
    let saved: Result | null = null;
    const registry: Registry = { get: async () => saved, commit: async (r) => saved = { ...r.result, recorded: true } };
    const interpret = vi.fn(async () => interpretations);
    const first = await submit(s, { catalog: c, registry, interpret, now });
    expect(first.taxResolutions![0].status).toBe("ESTIMADO");
    const replay = await submit(s, { catalog: c, registry, interpret, now: new Date("2028-01-01") });
    expect(replay).toEqual(first); expect(interpret).toHaveBeenCalledTimes(1);
    expect(replay.taxResolutions![0].estimation.policyVersion).toBe("referential-estimation-2026-09-22-v1");
  });
});
