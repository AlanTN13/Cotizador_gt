import operational from "../../data/courier-catalog.json";
import type { Catalog, Profile, Taxes } from "./types";
import { CourierError } from "./types";
export const referenceEnabled = () =>
  process.env.COURIER_REFERENCE_MODE === "true" &&
  process.env.VERCEL_ENV !== "production" &&
  (process.env.VERCEL_ENV === "preview" ||
    process.env.NODE_ENV !== "production");
const approval = {
  approvedBy: "TEST_ONLY",
  approvedAt: "2026-01-01T00:00:00Z",
  validUntil: "2030-01-01T00:00:00Z",
  sources: ["Synthetic arithmetic fixture. No regulatory validity."],
};
const tax: Taxes = {
  duty: 0,
  statistical: 0,
  vat: 0.21,
  additionalVat: 0,
  income: 0,
  internal: 0,
};
const profile = (
  id: string,
  name: string,
  overrides: Partial<Profile>,
): Profile => ({
  id,
  name,
  aliases: [name],
  sim: "TEST-NOT-A-SIM",
  origin: "China",
  required: {},
  decision: "allowed",
  reason: "",
  taxes: { ...tax },
  approval,
  ...overrides,
});
export const referenceCatalog: Catalog = {
  version: "reference-1",
  scope: "reference",
  owner: "Technical fixtures only",
  profiles: [
    profile("test-zero", "Muestra técnica A", { taxes: { ...tax, duty: 0 } }),
    profile("test-duty", "Muestra técnica B", {
      taxes: { ...tax, duty: 0.35 },
    }),
    profile("test-denied", "Muestra técnica no apta", {
      decision: "denied",
      reason: "Caso técnico no apto para comprobar el bloqueo.",
    }),
    profile("test-missing", "Muestra técnica sin tasa", {
      taxes: { ...tax, duty: null },
    }),
  ],
  tariff: {
    version: "reference-tariff-1",
    approval,
    divisor: 5000,
    aggregation: "shipment",
    increment: 0.5,
    minimumKg: 1,
    brackets: [{ upToKg: 1000, usdPerKg: 10 }],
    handlingUsd: 50,
    handlingVat: 0.21,
    insuranceRate: 0,
    statisticalCapUsd: 180,
    allocation: "value",
    validityHours: 24,
  },
};
export function getCatalog(reference: boolean): Catalog {
  if (reference) {
    if (!referenceEnabled())
      throw new CourierError(
        "REFERENCE_DISABLED",
        "Los casos técnicos no están habilitados en este entorno.",
        403,
      );
    return referenceCatalog;
  }
  return operational as Catalog;
}
