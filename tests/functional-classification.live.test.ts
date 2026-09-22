import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import cases from "./fixtures/functional-classification-cases.json";
import { getCatalog } from "../lib/courier/catalog";
import { interpret } from "../lib/courier/classifier";
import { decide } from "../lib/courier/engine";
import type { Submission } from "../lib/courier/types";

const negativeCases = [
  "Ventilador de mesa de 50 W, sin columna ni caño extensible, para uso doméstico.",
  "T-shirt de punto para adulto de 100% poliéster, sin algodón.",
  "Cuchara para té de acero inoxidable con mango de plástico; no es íntegramente de acero.",
  "Lámpara LED diseñada exclusivamente como recambio de faro de automóvil, alimentación 12 V.",
  "Taza individual de porcelana para café, apta para contacto con alimentos; no es gres.",
];

// Opt-in evaluation against the real provider. Expected SIM/DIE never go into
// the classifier request. No registry writes, emails or production submissions.
it.runIf(process.env.COURIER_FUNCTIONAL_LIVE === "true")(
  "LIVE evaluate the five user-supplied descriptions against the current catalog",
  async () => {
    const catalog = getCatalog(false);
    const negative = process.env.COURIER_EVAL_NEGATIVE === "true";
    const submission: Submission = {
      requestId: "adea80a0-7227-4ba1-af39-273c4963cb06",
      products: cases.cases.map((c, index) => ({
        description: negative ? negativeCases[index] : c.description,
        url: "", // Description-only eval; Alibaba access is a separate concern.
        quantity: 1,
        valueUsd: 100,
        origin: "China",
        attributes: {},
      })),
      parcels: [{ quantity: 1, width: 20, height: 20, length: 20, grossWeight: 5 }],
      contact: { name: "Functional evaluation", email: "qa@example.com" },
      route: "CN-BUE",
      condition: "new",
      purpose: "commercial",
      reference: false,
      website: "",
    };
    const interpretations = await interpret(submission, catalog);
    const result = decide(submission, catalog, interpretations);
    const rows = cases.cases.map((c, index) => {
      const actual = interpretations.find((i) => i.productIndex === index)!;
      const profile = actual.candidateIds.length === 1
        ? catalog.profiles.find((p) => p.id === actual.candidateIds[0])
        : undefined;
      return {
        id: c.id,
        expected: c.expected,
        actual: { sim: profile?.sim ?? null, dieRate: profile?.taxes.duty ?? null },
        match: negative ? actual.candidateIds.length === 0 : actual.issue === null && actual.missing.length === 0 &&
          profile?.sim === c.expected.sim && profile?.taxes.duty === c.expected.dieRate,
        interpretation: actual,
      };
    });
    const report = {
      executedAt: new Date().toISOString(),
      mode: negative ? "live-negative-variants" : "live-description-only-catalog-selection",
      model: process.env.COURIER_OPENAI_MODEL || "gpt-4.1-mini",
      catalogVersion: catalog.version,
      total: rows.length,
      matched: rows.filter((r) => r.match).length,
      status: result.status,
      calculation: result.calculation,
      rows,
    };
    if (process.env.COURIER_EVAL_REPORT) {
      writeFileSync(process.env.COURIER_EVAL_REPORT, JSON.stringify(report, null, 2) + "\n");
    }
    console.info(JSON.stringify(report));
    expect(interpretations).toHaveLength(5);
    expect(result.status).toBe("REQUIERE_REVISION");
    expect(result.calculation).toBeNull();
    if (process.env.COURIER_EVAL_REQUIRE_MATCH === "true") {
      expect(rows.filter((r) => !r.match).map((r) => r.id)).toEqual([]);
    }
  },
  30000,
);
