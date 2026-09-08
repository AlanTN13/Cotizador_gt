export type Status = "COTIZADO" | "REQUIERE_REVISION" | "NO_APTO_COURIER";
export type Product = {
  description: string;
  url: string;
  quantity: number;
  valueUsd: number;
  origin: string;
  attributes: Record<string, string>;
};
export type Parcel = {
  quantity: number;
  width: number;
  height: number;
  length: number;
  grossWeight: number;
};
export type Submission = {
  requestId: string;
  products: Product[];
  parcels: Parcel[];
  contact: { name: string; email: string };
  route: "CN-BUE";
  condition: "new";
  purpose: "commercial";
  reference: boolean;
  website: string;
};
export type Approval = {
  approvedBy: string;
  approvedAt: string;
  validUntil: string;
  sources: string[];
};
export type Taxes = {
  duty: number | null;
  statistical: number | null;
  vat: number | null;
  additionalVat: number | null;
  income: number | null;
  internal: number | null;
};
export type Profile = {
  id: string;
  name: string;
  aliases: string[];
  sim: string | null;
  origin: string;
  required: Record<string, string>;
  decision: "allowed" | "denied" | "review";
  reason: string;
  taxes: Taxes;
  approval: Approval | null;
};
export type Tariff = {
  version: string;
  approval: Approval | null;
  divisor: number;
  aggregation: "shipment" | "parcel";
  increment: number;
  minimumKg: number;
  brackets: { upToKg: number; usdPerKg: number }[];
  handlingUsd: number;
  handlingVat: number;
  insuranceRate: number;
  statisticalCapUsd: number;
  allocation: "value";
  validityHours: number;
};
export type Catalog = {
  version: string;
  scope: "operational" | "reference";
  owner: string;
  profiles: Profile[];
  tariff: Tariff | null;
};
export type Interpretation = {
  productIndex: number;
  name: string;
  candidateIds: string[];
  attributes: Record<string, string>;
  missing: string[];
  evidence: string[];
  issue: string | null;
};
export type Line = {
  name: string;
  sim: string;
  merchandiseUsd: number;
  customsBaseUsd: number;
  dutyUsd: number;
  statisticalUsd: number;
  vatUsd: number;
  additionalVatUsd: number;
  incomeUsd: number;
  taxesUsd: number;
};
export type Calculation = {
  merchandiseUsd: number;
  grossKg: number;
  volumetricKg: number;
  chargeableKg: number;
  freightUsd: number;
  insuranceUsd: number;
  handlingUsd: number;
  handlingVatUsd: number;
  taxesUsd: number;
  totalServiceUsd: number;
  lines: Line[];
  expiresAt: string;
};
export type Result = {
  requestId: string;
  status: Status;
  simulation: boolean;
  reasons: { code: string; message: string; productIndex?: number }[];
  requestedAttributes?: { productIndex: number; key: string }[];
  interpretations: Interpretation[];
  calculation: Calculation | null;
  catalogVersion: string;
  tariffVersion: string | null;
  engineVersion: string;
  classifierVersion: string;
  createdAt: string;
  recorded: boolean;
};
export type RecordEnvelope = {
  requestId: string;
  fingerprint: string;
  submission: Submission;
  result: Result;
  queue: "cotizaciones";
  environment: string;
};
export interface Registry {
  get(id: string, fingerprint: string): Promise<Result | null>;
  commit(record: RecordEnvelope): Promise<Result>;
}
export class CourierError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus = 503,
  ) {
    super(message);
  }
}
