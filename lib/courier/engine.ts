import Decimal from "decimal.js";
import type {
  Approval,
  Catalog,
  Interpretation,
  Product,
  Result,
  Submission,
  Tariff,
} from "./types";
export const ENGINE_VERSION = "courier-air-1.0.0";
const money = (n: Decimal.Value) =>
  new Decimal(n).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
const sum = (v: Decimal.Value[]) =>
  v.reduce<Decimal>((a, b) => a.plus(b), new Decimal(0));
export function approved(a: Approval | null, now: Date, reference: boolean) {
  if (
    !a ||
    !a.sources.length ||
    !a.approvedBy ||
    !Number.isFinite(Date.parse(a.approvedAt)) ||
    !Number.isFinite(Date.parse(a.validUntil))
  )
    return false;
  if (!reference && a.approvedBy !== "Germán Jiménez") return false;
  return Date.parse(a.approvedAt) <= +now && +now < Date.parse(a.validUntil);
}
export function weights(s: Submission, t: Tariff) {
  const parts = s.parcels.map((p) => ({
    g: new Decimal(p.grossWeight).mul(p.quantity),
    v: new Decimal(p.width)
      .mul(p.height)
      .mul(p.length)
      .mul(p.quantity)
      .div(t.divisor),
  }));
  const gross = sum(parts.map((p) => p.g));
  const volume = sum(parts.map((p) => p.v));
  const round = (n: Decimal) => n.div(t.increment).ceil().mul(t.increment);
  const charge =
    t.aggregation === "shipment"
      ? round(Decimal.max(gross, volume))
      : sum(
          s.parcels.map((p) =>
            round(
              Decimal.max(
                p.grossWeight,
                new Decimal(p.width).mul(p.height).mul(p.length).div(t.divisor),
              ),
            ).mul(p.quantity),
          ),
        );
  return {
    grossKg: gross.toNumber(),
    volumetricKg: volume.toNumber(),
    chargeableKg: Decimal.max(charge, t.minimumKg).toNumber(),
  };
}
function distribute(amount: number, products: Product[]) {
  const total = sum(products.map((p) => p.valueUsd));
  const cents = new Decimal(amount).mul(100).round().toNumber();
  const shares = products.map((p, index) => {
    const raw = new Decimal(cents).mul(p.valueUsd).div(total);
    return {
      index,
      cents: raw.floor().toNumber(),
      remainder: raw.minus(raw.floor()).toNumber(),
    };
  });
  let remaining = cents - shares.reduce((a, b) => a + b.cents, 0);
  for (const share of [...shares].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  )) {
    if (remaining-- > 0) share.cents++;
  }
  return shares.map((s) => s.cents / 100);
}
export function decide(
  s: Submission,
  catalog: Catalog,
  interpretations: Interpretation[],
  now = new Date(),
  classifierVersion = "unknown",
): Result {
  const result: Result = {
    requestId: s.requestId,
    status: "REQUIERE_REVISION",
    simulation: catalog.scope === "reference",
    reasons: [],
    interpretations,
    calculation: null,
    catalogVersion: catalog.version,
    tariffVersion: catalog.tariff?.version ?? null,
    engineVersion: ENGINE_VERSION,
    classifierVersion,
    createdAt: now.toISOString(),
    recorded: false,
  };
  const reason = (code: string, message: string, productIndex?: number) =>
    result.reasons.push({
      code,
      message,
      ...(productIndex === undefined ? {} : { productIndex }),
    });
  if (sum(s.products.map((p) => p.valueUsd)).gt(3000))
    reason("FOB_LIMIT", "El valor total supera USD 3.000 FOB por envío.");
  if (s.parcels.some((p) => p.grossWeight > 50))
    reason(
      "PARCEL_WEIGHT_LIMIT",
      "Cada bulto debe pesar hasta 50 kg brutos. Revisá el peso unitario.",
    );
  if (result.reasons.length) {
    result.status = "NO_APTO_COURIER";
    return result;
  }
  const profiles = s.products.map((p, i) => {
    const interpretation = interpretations.find((x) => x.productIndex === i);
    if (
      !interpretation ||
      interpretation.issue ||
      interpretation.candidateIds.length !== 1 ||
      interpretation.missing.length
    ) {
      reason(
        "CLASSIFICATION_REVIEW",
        interpretation?.missing.length
          ? "Falta confirmar: " + interpretation.missing.join(", ") + "."
          : "No pudimos identificar una variante única. Un asesor debe revisar este producto.",
        i,
      );
      return null;
    }
    const profile = catalog.profiles.find(
      (x) => x.id === interpretation.candidateIds[0],
    );
    if (!profile || !approved(profile.approval, now, result.simulation)) {
      reason(
        "PROFILE_NOT_APPROVED",
        "El producto todavía no tiene un perfil vigente aprobado para cotizar.",
        i,
      );
      return null;
    }
    if (p.origin !== "China" || profile.origin !== p.origin) {
      reason(
        "ORIGIN_REVIEW",
        "Confirmá el país de fabricación. Este perfil cubre únicamente origen China.",
        i,
      );
      return null;
    }
    const missing = Object.entries(profile.required).filter(
      ([key, value]) => p.attributes[key] !== value,
    );
    if (missing.length) {
      result.requestedAttributes = [
        ...(result.requestedAttributes || []),
        ...missing.map(([key]) => ({ productIndex: i, key })),
      ];
      reason(
        "ATTRIBUTES_REQUIRED",
        "Confirmá estos datos técnicos: " +
          missing.map(([k, v]) => k + " = " + v).join("; ") +
          ".",
        i,
      );
      return null;
    }
    if (profile.decision === "denied") {
      reason("PRODUCT_NOT_ALLOWED", profile.reason, i);
      return profile;
    }
    if (profile.decision !== "allowed") {
      reason("PRODUCT_REVIEW", profile.reason, i);
      return null;
    }
    if (!profile.sim) {
      reason(
        "SIM_MISSING",
        "Falta una posición validada para este producto.",
        i,
      );
      return null;
    }
    if (
      Object.values(profile.taxes).some(
        (t) => t === null || !Number.isFinite(t) || t < 0 || t > 1,
      )
    ) {
      reason(
        "TAX_MISSING",
        "Falta validar una condición tributaria; no se aplicará una tasa por defecto.",
        i,
      );
      return null;
    }
    if (profile.taxes.internal !== 0) {
      reason(
        "INTERNAL_TAX_REVIEW",
        "El impuesto interno de este producto requiere liquidación específica.",
        i,
      );
      return null;
    }
    return profile;
  });
  if (result.reasons.some((r) => r.code === "PRODUCT_NOT_ALLOWED")) {
    result.status = "NO_APTO_COURIER";
    return result;
  }
  const t = catalog.tariff;
  if (!t || !approved(t.approval, now, result.simulation))
    reason(
      "TARIFF_NOT_APPROVED",
      "La tarifa aérea necesita validación comercial antes de emitir un precio.",
    );
  if (result.reasons.length || !t) return result;
  if (
    [
      t.divisor,
      t.increment,
      t.minimumKg,
      t.handlingUsd,
      t.handlingVat,
      t.insuranceRate,
      t.statisticalCapUsd,
      t.validityHours,
      ...t.brackets.flatMap((b) => [b.upToKg, b.usdPerKg]),
    ].some((n) => !Number.isFinite(n) || n < 0) ||
    !["shipment", "parcel"].includes(t.aggregation) ||
    t.handlingVat > 1 ||
    t.insuranceRate > 1 ||
    t.validityHours <= 0 ||
    !t.brackets.length ||
    t.divisor <= 0 ||
    t.increment <= 0 ||
    t.minimumKg < 0 ||
    t.allocation !== "value" ||
    t.brackets.some(
      (b, i) =>
        b.usdPerKg < 0 ||
        b.upToKg <= 0 ||
        (i > 0 && b.upToKg <= t.brackets[i - 1].upToKg),
    )
  ) {
    reason("TARIFF_INVALID", "La configuración de tarifas requiere revisión.");
    return result;
  }
  const w = weights(s, t);
  const bracket = t.brackets.find((b) => w.chargeableKg <= b.upToKg);
  if (!bracket) {
    reason(
      "TARIFF_RANGE",
      "El peso está fuera de las escalas disponibles. Un asesor revisará la tarifa.",
    );
    return result;
  }
  const merchandise = money(sum(s.products.map((p) => p.valueUsd)));
  const freight = money(new Decimal(w.chargeableKg).mul(bracket.usdPerKg));
  const insurance = money(
    new Decimal(merchandise).plus(freight).mul(t.insuranceRate),
  );
  const freightShares = distribute(freight, s.products),
    insuranceShares = distribute(insurance, s.products);
  const bases = s.products.map((p, i) =>
    money(
      new Decimal(p.valueUsd).plus(freightShares[i]).plus(insuranceShares[i]),
    ),
  );
  const rawStat = bases.map((b, i) =>
    new Decimal(b).mul(profiles[i]!.taxes.statistical!),
  );
  const statTotal = sum(rawStat);
  const cap = new Decimal(t.statisticalCapUsd);
  const statShares = statTotal.gt(cap)
    ? distribute(
        t.statisticalCapUsd,
        s.products.map((p, i) => ({ ...p, valueUsd: rawStat[i].toNumber() })),
      )
    : rawStat.map(money);
  const lines = s.products.map((p, i) => {
    const profile = profiles[i]!;
    const taxes = profile.taxes;
    const duty = money(new Decimal(bases[i]).mul(taxes.duty!));
    const stat = statShares[i];
    const taxable = new Decimal(bases[i]).plus(duty).plus(stat);
    const vat = money(taxable.mul(taxes.vat!));
    const additional = money(taxable.mul(taxes.additionalVat!));
    const income = money(taxable.mul(taxes.income!));
    return {
      name: profile.name,
      sim: profile.sim!,
      merchandiseUsd: p.valueUsd,
      customsBaseUsd: bases[i],
      dutyUsd: duty,
      statisticalUsd: stat,
      vatUsd: vat,
      additionalVatUsd: additional,
      incomeUsd: income,
      taxesUsd: money(
        new Decimal(duty).plus(stat).plus(vat).plus(additional).plus(income),
      ),
    };
  });
  const taxes = money(sum(lines.map((l) => l.taxesUsd))),
    handlingVat = money(new Decimal(t.handlingUsd).mul(t.handlingVat));
  result.calculation = {
    ...w,
    merchandiseUsd: merchandise,
    freightUsd: freight,
    insuranceUsd: insurance,
    handlingUsd: t.handlingUsd,
    handlingVatUsd: handlingVat,
    taxesUsd: taxes,
    totalServiceUsd: money(
      new Decimal(freight)
        .plus(insurance)
        .plus(t.handlingUsd)
        .plus(handlingVat)
        .plus(taxes),
    ),
    lines,
    expiresAt: new Date(
      Math.min(
        +now + t.validityHours * 3600000,
        Date.parse(t.approval!.validUntil),
        ...profiles.map((p) => Date.parse(p!.approval!.validUntil)),
      ),
    ).toISOString(),
  };
  result.status = "COTIZADO";
  return result;
}
