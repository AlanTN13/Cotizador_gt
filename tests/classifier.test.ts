import { it, expect, vi, afterEach } from "vitest";
import { interpret } from "../lib/courier/classifier";
import { referenceCatalog } from "../lib/courier/catalog";
import type { Submission } from "../lib/courier/types";
const submission: Submission = {
  requestId: "9b7be7a7-0664-4da2-95cb-5cc1c533b777",
  products: [
    {
      description: "Tornillo de acero M6 nuevo para uso industrial",
      url: "",
      quantity: 10,
      valueUsd: 100,
      origin: "China",
      attributes: {},
    },
  ],
  parcels: [{ quantity: 1, width: 10, height: 10, length: 10, grossWeight: 2 }],
  contact: { name: "QA Courier", email: "courier-qa@example.com" },
  route: "CN-BUE",
  condition: "new",
  purpose: "commercial",
  reference: false,
  website: "",
};
const catalog = { ...referenceCatalog, scope: "operational" as const };
const answer = (candidateIds = ["test-zero"]) => ({
  products: [
    {
      productIndex: 0,
      name: "Tornillo",
      candidateIds,
      facts: [],
      missing: [],
      evidence: ["Tornillo de acero"],
    },
  ],
});
function respond(value = answer()) {
  vi.stubEnv("OPENAI_API_KEY", "test-no-real-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        status: "completed",
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(value) }] },
        ],
      }),
    ),
  );
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it("rejects a mixture of invented and real candidate IDs", async () => {
  respond(answer(["test-zero", "invented"]));
  expect((await interpret(submission, catalog))[0].issue).toBe(
    "INVALID_CANDIDATE",
  );
});
it("fails closed on refusal and provider outage", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-no-real-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ error: "offline" }, { status: 503 })),
  );
  await expect(interpret(submission, catalog)).rejects.toThrow();
});
it("rejects duplicate product indices", async () => {
  const value = answer();
  value.products.push(value.products[0]);
  respond(value);
  await expect(interpret(submission, catalog)).rejects.toThrow();
});
it("never sends customer contact details to the classifier", async () => {
  respond();
  await interpret(submission, catalog);
  const request = String(vi.mocked(fetch).mock.calls[0][1]?.body);
  expect(request).not.toContain("courier-qa@example.com");
  expect(request).not.toContain("QA Courier");
  expect(request).toContain("json_schema");
  expect(request).toContain('"store":false');
});
it.runIf(process.env.COURIER_LIVE_TEST === "true")(
  "LIVE OpenAI interpretation uses real provider and unapproved catalog",
  async () => {
    const output = await interpret(submission, {
      ...catalog,
      profiles: [],
      tariff: null,
    });
    expect(output).toHaveLength(1);
    expect(output[0].name.length).toBeGreaterThan(0);
    expect(output[0].candidateIds).toEqual([]);
    console.info(
      JSON.stringify({
        liveClassifier: "passed",
        name: output[0].name,
        missing: output[0].missing,
        candidateIds: output[0].candidateIds,
      }),
    );
  },
  30000,
);
