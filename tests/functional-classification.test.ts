import { expect, it, vi, afterEach } from "vitest";
import cases from "./fixtures/functional-classification-cases.json";
import { getCatalog } from "../lib/courier/catalog";
import { interpret } from "../lib/courier/classifier";
import { decide } from "../lib/courier/engine";
import type { Submission } from "../lib/courier/types";

const catalog = getCatalog(false);
function submission(description: string): Submission {
  return {
    requestId: "adea80a0-7227-4ba1-af39-273c4963cb06",
    products: [{ description, url: "", quantity: 1, valueUsd: 100, origin: "China", attributes: {} }],
    parcels: [{ quantity: 1, width: 20, height: 20, length: 20, grossWeight: 5 }],
    contact: { name: "QA", email: "qa@example.com" },
    route: "CN-BUE", condition: "new", purpose: "commercial", reference: false, website: "",
  };
}

it.each(cases.cases)("$id retains full SIM/DIE without enabling an unapproved quote", (c) => {
  const profile = catalog.profiles.find((p) => p.id === c.id)!;
  // Golden expectations live separately from the application catalog. In
  // particular these fail if AEC 35%/10.8% replaces the supplied DIE 20%.
  expect(profile.sim).toBe(c.expected.sim);
  expect(profile.taxes.duty).toBe(c.expected.dieRate);
  const s = submission(c.description);
  s.products[0].attributes = { ...profile.required };
  const result = decide(s, catalog, [{
    productIndex: 0, name: c.name, candidateIds: [profile.id],
    attributes: { ...profile.required }, missing: [], evidence: [c.description], issue: null,
  }]);
  expect(result).toMatchObject({ status: "REQUIERE_REVISION", calculation: null });
  expect(result.reasons.some((r) => r.code === "PROFILE_NOT_APPROVED")).toBe(true);
});

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("does not send SIM or tax answers to the model for catalog selection", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-no-real-key");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    status: "completed",
    output: [{ content: [{ type: "output_text", text: JSON.stringify({ products: [{
      productIndex: 0, name: "Ventilador", candidateIds: [], facts: [], missing: [], evidence: [],
    }] }) }] }],
  })));
  await interpret(submission(cases.cases[0].description), catalog);
  const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  const input = JSON.parse(body.input);
  for (const candidate of input.catalog) {
    expect(Object.keys(candidate).sort()).toEqual(["aliases", "id", "name", "required"]);
  }
  for (const c of cases.cases) expect(body.input).not.toContain(c.expected.sim);
});
