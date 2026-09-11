import { describe, it, expect, vi, afterEach } from "vitest";
import { referenceCatalog, getCatalog } from "../lib/courier/catalog";
import { decide } from "../lib/courier/engine";
import { submit, fingerprint } from "../lib/courier/service";
import { interpret } from "../lib/courier/classifier";
import { submissionSchema } from "../lib/courier/schema";
import { publicIpv4, readProductUrl } from "../lib/courier/url";
import { CourierError } from "../lib/courier/types";
import type { Submission, Registry, Result } from "../lib/courier/types";
const now = new Date("2026-09-08T00:00:00Z");
const sample = (): Submission => ({
  requestId: "9b7be7a7-0664-4da2-95cb-5cc1c533b777",
  products: [
    {
      description: "Muestra técnica A",
      url: "",
      quantity: 1,
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
  reference: true,
  website: "",
});
const catalog = () => structuredClone(referenceCatalog);
async function run(s = sample(), c = catalog()) {
  return decide(s, c, await interpret(s, c), now, "reference-test");
}
function registry(): Registry & {
  rows: Map<string, { fingerprint: string; result: Result }>;
} {
  const rows = new Map();
  return {
    rows,
    async get(id, hash) {
      const row = rows.get(id);
      if (row && row.fingerprint !== hash)
        throw new CourierError("IDEMPOTENCY_CONFLICT", "Conflict", 409);
      return row?.result || null;
    },
    async commit(record) {
      const prior = await this.get(record.requestId, record.fingerprint);
      if (prior) return prior;
      const result = { ...record.result, recorded: true };
      rows.set(record.requestId, { fingerprint: record.fingerprint, result });
      return result;
    },
  };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Courier deterministic reference cases (not approved commercial rates)", () => {
  it("known product calculates independently verified total, valid zero duty", async () => {
    const r = await run();
    expect(r.status).toBe("COTIZADO");
    expect(r.calculation).toMatchObject({
      freightUsd: 20,
      handlingUsd: 50,
      handlingVatUsd: 10.5,
      taxesUsd: 25.2,
      totalServiceUsd: 105.7,
      chargeableKg: 2,
    });
    expect(r.calculation?.lines[0].dutyUsd).toBe(0);
  });
  it("non eligible product never has price", async () => {
    const s = sample();
    s.products[0].description = "Muestra técnica no apta";
    expect(await run(s)).toMatchObject({
      status: "NO_APTO_COURIER",
      calculation: null,
    });
  });
  it("ambiguous product goes to review", async () => {
    const s = sample();
    s.products[0].description = "Un accesorio";
    expect(await run(s)).toMatchObject({
      status: "REQUIERE_REVISION",
      calculation: null,
    });
  });
  it("missing duty is not zero or fallback20", async () => {
    const s = sample();
    s.products[0].description = "Muestra técnica sin tasa";
    const r = await run(s);
    expect(r.calculation).toBeNull();
    expect(r.reasons.some((x) => x.code === "TAX_MISSING")).toBe(true);
  });
  it("multiple parcels use aggregated volume and gross", async () => {
    const s = sample();
    s.parcels = [
      { quantity: 2, width: 50, height: 40, length: 40, grossWeight: 10 },
      { quantity: 1, width: 10, height: 10, length: 10, grossWeight: 20 },
    ];
    expect((await run(s)).calculation).toMatchObject({
      grossKg: 40,
      volumetricKg: 32.2,
      chargeableKg: 40,
      freightUsd: 400,
    });
  });
  it("different products retain individual conditions and cent allocations", async () => {
    const s = sample();
    s.products.push({ ...s.products[0], description: "Muestra técnica B" });
    const r = await run(s);
    expect(r.calculation?.lines.map((l) => l.dutyUsd)).toEqual([0, 38.5]);
    expect(r.calculation?.lines.map((l) => l.vatUsd)).toEqual([23.1, 31.19]);
    expect(r.calculation?.totalServiceUsd).toBe(173.29);
  });
  it.each([3000, 3000.01])("FOB boundary %s", async (value) => {
    const s = sample();
    s.products[0].valueUsd = value;
    expect((await run(s)).status).toBe(
      value === 3000 ? "COTIZADO" : "NO_APTO_COURIER",
    );
  });
  it.each([50, 50.01])("weight per package boundary %s", async (weight) => {
    const s = sample();
    s.parcels[0].grossWeight = weight;
    s.parcels[0].quantity = 2;
    expect((await run(s)).status).toBe(
      weight === 50 ? "COTIZADO" : "NO_APTO_COURIER",
    );
  });
  it("no three-unit noncommercial restriction is applied", async () => {
    const s = sample();
    s.products[0].quantity = 20;
    expect((await run(s)).status).toBe("COTIZADO");
  });
  it("expired approval blocks pricing", async () => {
    const c = catalog();
    c.profiles[0].approval!.validUntil = "2026-01-01";
    expect((await run(sample(), c)).calculation).toBeNull();
  });
  it("unapproved operational dataset never quotes", async () => {
    const s = sample();
    s.reference = false;
    expect(decide(s, getCatalog(false), [], now).calculation).toBeNull();
  });
  it("invented/unknown classification IDs do not quote", async () => {
    expect(
      decide(
        sample(),
        catalog(),
        [
          {
            productIndex: 0,
            name: "x",
            candidateIds: ["fake"],
            attributes: {},
            missing: [],
            evidence: [],
            issue: null,
          },
        ],
        now,
      ).calculation,
    ).toBeNull();
  });
  it("required material attributes must be declared by customer", async () => {
    const c = catalog();
    c.profiles[0].required = { material: "steel" };
    expect((await run(sample(), c)).calculation).toBeNull();
    const s = sample();
    s.products[0].attributes = { material: "steel" };
    expect((await run(s, c)).status).toBe("COTIZADO");
  });
  it.each([NaN, -1, Infinity])(
    "invalid tariff %s fails closed",
    async (value) => {
      const c = catalog();
      c.tariff!.insuranceRate = value;
      expect((await run(sample(), c)).calculation).toBeNull();
    },
  );
  it("reference mode cannot be activated by production client", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("COURIER_REFERENCE_MODE", "true");
    expect(() => getCatalog(true)).toThrow();
  });
  it("invalid payloads reject maritime/used/empty/nonfinite", () => {
    for (const patch of [
      { condition: "used" },
      { route: "SEA" },
      { products: [] },
      { parcels: [{ ...sample().parcels[0], grossWeight: NaN }] },
    ])
      expect(
        submissionSchema.safeParse({ ...sample(), ...patch }).success,
      ).toBe(false);
  });
});
describe("registration and failure semantics", () => {
  it("repeat and simultaneous submits persist one row and same result", async () => {
    const store = registry();
    const s = sample();
    const deps = { registry: store, catalog: catalog(), interpret, now };
    const results = await Promise.all([submit(s, deps), submit(s, deps)]);
    expect(store.rows.size).toBe(1);
    expect(results[0]).toEqual(results[1]);
    const interpreter = vi.fn(interpret);
    expect(await submit(s, { ...deps, interpret: interpreter })).toEqual(
      results[0],
    );
    expect(interpreter).not.toHaveBeenCalled();
  });
  it("same id changed payload conflicts, different id same hash", async () => {
    const store = registry();
    const s = sample();
    await submit(s, { registry: store, catalog: catalog(), interpret, now });
    expect(fingerprint(s)).toBe(
      fingerprint({ ...s, requestId: crypto.randomUUID() }),
    );
    await expect(
      submit(
        { ...s, contact: { ...s.contact, name: "Changed" } },
        { registry: store, catalog: catalog(), interpret, now },
      ),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("classifier outage creates review row without price", async () => {
    const store = registry();
    const result = await submit(sample(), {
      registry: store,
      catalog: catalog(),
      interpret: async () => {
        throw Error("offline");
      },
      now,
    });
    expect(result).toMatchObject({
      status: "REQUIERE_REVISION",
      recorded: true,
      calculation: null,
    });
    expect(result.reasons[0].code).toBe("CLASSIFIER_UNAVAILABLE");
  });
  it("registry read failure stops before classifier", async () => {
    const interpret = vi.fn();
    await expect(
      submit(sample(), {
        registry: {
          get: async () => {
            throw Error("offline");
          },
          commit: vi.fn(),
        },
        catalog: catalog(),
        interpret,
        now,
      }),
    ).rejects.toThrow();
    expect(interpret).not.toHaveBeenCalled();
  });
  it("registry commit failure never reports quote success", async () => {
    await expect(
      submit(sample(), {
        registry: {
          get: async () => null,
          commit: async () => {
            throw Error("offline");
          },
        },
        catalog: catalog(),
        interpret,
        now,
      }),
    ).rejects.toMatchObject({ code: "REGISTRY_UNAVAILABLE" });
  });
  it("lost commit response recovers saved result", async () => {
    const store = registry();
    const commit = store.commit.bind(store);
    store.commit = async (r) => {
      await commit(r);
      throw Error("connection lost");
    };
    const deps = { registry: store, catalog: catalog(), interpret, now };
    await expect(submit(sample(), deps)).rejects.toThrow();
    expect((await submit(sample(), deps)).recorded).toBe(true);
    expect(store.rows.size).toBe(1);
  });
});
describe("link reading safety", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.0.1",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
  ])("denies internal %s", (ip) => expect(publicIpv4(ip)).toBe(false));
  it("permits public addresses", () =>
    expect(publicIpv4("93.184.215.14")).toBe(true));
  it.each([
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com:8080",
  ])(
    "rejects unsafe URL %s",
    async (url) =>
      await expect(readProductUrl(url)).rejects.toThrow("URL_NOT_SUPPORTED"),
  );
});
