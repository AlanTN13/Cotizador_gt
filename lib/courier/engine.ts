import Decimal from "decimal.js";
import { normalizePosition, resolveTaxes, TAX_SCOPE, taxDataset } from "./tax-resolver";
import type {
  Approval,
  Catalog,
  Interpretation,
  Product,
  Result,
  Submission,
  Tariff,
} from "./types";
export const ENGINE_VERSION = "courier-air-1.2.0";
const comparableFact = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, "");
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
    ...(catalog.scope === "operational" ? {
      taxScope: TAX_SCOPE,
      warnings: [],
      taxResolutions: s.products.map((_, i) => ({
        ...resolveTaxes(null, i, now), reasons: ["TAX_NOT_ATTEMPTED"],
      })),
    } : {}),
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
  const warn = (code: string, message: string, productIndex: number) => {
    result.warnings = [...(result.warnings || []), { code, message, productIndex }];
  };
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
    if (!interpretation || interpretation.issue || !interpretation.candidateIds.length ||
        (result.simulation && (interpretation.candidateIds.length !== 1 || interpretation.missing.length))) {
      reason("CLASSIFICATION_REVIEW", "No pudimos identificar mínimamente una clasificación compatible para este producto.", i);
      return null;
    }
    const candidates = interpretation.candidateIds.map((id) => catalog.profiles.find((x) => x.id === id));
    if (candidates.some((p) => !p)) {
      reason("CLASSIFICATION_REVIEW", "La clasificación propuesta no está disponible.", i);
      return null;
    }
    const profile = candidates[0]!;
    if (candidates.length > 1) {
      // Multiple descriptions may still identify the same minimum NCM.
      // Only economically/operationally equivalent candidates can continue.
      const treatment = candidates.map((candidate) => resolveTaxes(candidate!.sim, i, now));
      const ncm = normalizePosition(profile.sim)?.slice(0, 8);
      if (!ncm || candidates.some((c) => c!.decision !== "allowed" || c!.origin !== profile.origin ||
          normalizePosition(c!.sim)?.slice(0, 8) !== ncm) ||
          treatment.some((t) => t.status === "REQUIERE_REVISION" || JSON.stringify(t.rates) !== JSON.stringify(treatment[0].rates))) {
        reason("CLASSIFICATION_REVIEW", "Las clasificaciones posibles tienen diferencias materiales o de aptitud Courier.", i);
        return null;
      }
      warn("EQUIVALENT_CLASSIFICATIONS", "Hay variantes probables con la misma posición NCM y tratamiento estimado.", i);
    }
    if (!approved(profile.approval, now, result.simulation)) {
      if (result.simulation) {
        reason("PROFILE_NOT_APPROVED", "El perfil técnico no tiene aprobación vigente.", i);
        return null;
      }
      // A formal tax sign-off is not a prerequisite for a commercial estimate.
      // Courier eligibility is still checked independently via decision below.
      warn("PROFILE_REFERENCE", "Se utiliza la clasificación probable del perfil como referencia comercial.", i);
    }
    if (p.origin !== "China" || profile.origin !== p.origin) {
      reason("ORIGIN_REVIEW", "Confirmá el país de fabricación. Este perfil cubre únicamente origen China.", i);
      return null;
    }
    const optional = result.simulation ? [] : profile.optionalForEstimate || [];
    const facts = result.simulation ? p.attributes : { ...interpretation.attributes, ...p.attributes };
    // Only differences that can change the classification/Courier decision
    // are blocking. Accessory details remain visible in the submitted facts.
    const contradictions = Object.entries(profile.required).filter(([key, value]) =>
      !optional.includes(key) && [p.attributes[key], ...(result.simulation ? [] : [interpretation.attributes[key]])]
        .some((fact) => fact !== undefined && comparableFact(fact) !== comparableFact(value)));
    if (contradictions.length) {
      reason("CLASSIFICATION_CONTRADICTION", "Los datos del producto contradicen la variante propuesta.", i);
      return null;
    }
    const missing = Object.entries(profile.required).filter(([key]) => facts[key] === undefined && !optional.includes(key));
    const backedClassification = !result.simulation && !interpretation.missing.length && interpretation.evidence.length > 0;
    if (missing.length && !backedClassification) {
      result.requestedAttributes = [...(result.requestedAttributes || []), ...missing.map(([key]) => ({ productIndex: i, key }))];
      reason("ATTRIBUTES_REQUIRED", "Faltan datos que pueden cambiar la clasificación o la aptitud Courier: " + missing.map(([key]) => key).join(", ") + ".", i);
      return null;
    }
    if (missing.length && backedClassification)
      warn("CLASSIFICATION_EVIDENCE", "La clasificación probable se apoya en la descripción o enlace; no requiere volver a cargar los mismos datos.", i);
    if (!result.simulation && (interpretation.missing.length || optional.some((key) => facts[key] !== profile.required[key])))
      warn("MINOR_CLASSIFICATION_UNCERTAINTY", "La estimación admite diferencias o datos pendientes en características accesorias.", i);
    if (profile.decision === "denied") {
      if (!approved(profile.approval, now, result.simulation)) {
        reason("PRODUCT_REVIEW", "El producto presenta un posible impedimento Courier.", i);
        return null;
      }
      reason("PRODUCT_NOT_ALLOWED", profile.reason, i);
      return profile;
    }
    const resolution = result.simulation ? null : resolveTaxes(profile.sim, i, now, taxDataset, {
      position: profile.sim || "", duty: profile.taxes.duty,
      statistical: profile.taxes.statistical, vat: profile.taxes.vat,
      profileId: profile.id, catalogVersion: catalog.version,
    });
    if (resolution) result.taxResolutions![i] = resolution;
    if (profile.decision !== "allowed") {
      reason("PRODUCT_REVIEW", profile.reason, i);
    }
    if (resolution?.status === "REQUIERE_REVISION") {
      reason("TAX_REVIEW", "El tratamiento presenta una contradicción material o carece de una base mínima para estimar; requiere revisión.", i);
      return null;
    }
    if (resolution?.status === "ESTIMADO") {
      const estimated = resolution.estimation.components.map((component) => {
        const label = { duty: "DIE", statistical: "TE", vat: "IVA" }[component.tax];
        const rate = (resolution.rates[component.tax]! * 100).toLocaleString("es-AR");
        return `${label} ${rate}% (${component.method === "GENERAL_RULE" ? "regla general" : "referencia disponible"})`;
      });
      warn("ESTIMATED_TAX_TREATMENT", estimated.length
        ? "Alícuotas estimadas: " + estimated.join(", ") + ". Pueden variar en la liquidación definitiva."
        : "Se conserva el tratamiento del último archivo disponible, pendiente de actualización; la liquidación definitiva puede variar.", i);
    }
    // These concepts are explicitly outside the approved estimate, not exempt.
    // Their presence is disclosed, rather than turning V1 into a full tax engine.
    if (resolution && [profile.taxes.additionalVat, profile.taxes.income, profile.taxes.internal]
      .some((rate) => rate !== null && rate !== 0)) {
      warn("OUT_OF_SCOPE_TAX_EXCLUDED", "El perfil contiene tributos adicionales que no están incluidos en esta estimación (percepciones, Ganancias o internos).", i);
    }
    const effectiveProfile = resolution ? {
      ...profile,
      taxes: { ...resolution.rates, additionalVat: 0, income: 0, internal: 0 },
    } : profile;
    if (!profile.sim) {
      reason(
        "SIM_MISSING",
        "Falta una posición validada para este producto.",
        i,
      );
      return null;
    }
    if (
      Object.values(effectiveProfile.taxes).some(
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
    if (effectiveProfile.taxes.internal !== 0) {
      reason(
        "INTERNAL_TAX_REVIEW",
        "El impuesto interno de este producto requiere liquidación específica.",
        i,
      );
      return null;
    }
    return effectiveProfile;
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
      name: result.simulation ? profile.name : interpretations.find((x) => x.productIndex === i)!.name,
      sim: profile.sim!,
      ...(!result.simulation ? {
        ncm: result.taxResolutions![i].ncm!,
        taxRates: result.taxResolutions![i].rates,
        taxResolutionIndex: i,
      } : {}),
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
        ...(result.simulation ? profiles.map((p) => Date.parse(p!.approval!.validUntil)) : []),
        // A maintenance deadline already passed must not create an expired quote.
        ...(result.taxResolutions || []).flatMap((r) => [
          Date.parse(r.dutyEvidence?.source.reviewAfter || ""),
          Date.parse(r.vatEvidence?.source.reviewAfter || ""),
        ]).filter((expiry) => expiry > +now),
      ),
    ).toISOString(),
  };
  result.status = "COTIZADO";
  return result;
}
