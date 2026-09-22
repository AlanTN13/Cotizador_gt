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
    // Poison historical defaults to prove the resolver replaces all 3.
    taxes: { duty: .99, statistical: .99, vat: .99, additionalVat: null, income: null, internal: null },
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
  it("uncurated smartphone IVA is review, not an invented 21%", () => {
    const r = resolveTaxes("85171300000C", 0, now);
    expect(r.status).toBe("REQUIERE_REVISION");
    expect(r.rates).toEqual({ duty: .08, statistical: 0, vat: null });
    expect(r.reasons).toContain("VAT_NOT_COVERED");
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
    expect(resolveTaxes("85176241100X", 0, now).reasons).toEqual(["POSITION_NOT_FOUND"]);
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
  it.each(["2026-09-21", "2026-10-22", "invalid"])("invalid/outside review window %s", (date) => {
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
  it.each(["additionalVat", "income", "internal"] as const)("known %s cannot be silently omitted", (key) => {
    const { s, c, interpretations } = fixture(["84145190100R"]); c.profiles[0].taxes[key] = .01;
    expect(decide(s, c, interpretations, now).reasons.some((r) => r.code === "OUT_OF_SCOPE_TAX_REVIEW")).toBe(true);
  });
  it("no partial quote when one of multiple products lacks IVA", () => {
    const { s, c, interpretations } = fixture(["82159910130F", "85171300000C"]);
    expect(decide(s, c, interpretations, now)).toMatchObject({ status: "REQUIERE_REVISION", calculation: null });
  });
  it("tax evidence survives unapproved operational profiles and missing tariff", () => {
    const c = getCatalog(false), { s, interpretations } = fixture([c.profiles[0].sim!]);
    s.products[0].attributes = { ...c.profiles[0].required }; interpretations[0].candidateIds = [c.profiles[0].id];
    const r = decide(s, c, interpretations, now);
    expect(r.calculation).toBeNull(); expect(r.taxResolutions![0].status).toBe("RESUELTO");
    expect(r.reasons.map((r) => r.code)).toEqual(expect.arrayContaining(["PROFILE_NOT_APPROVED", "TARIFF_NOT_APPROVED"]));
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
