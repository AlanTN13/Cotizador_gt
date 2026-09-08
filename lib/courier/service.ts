import { createHash } from "node:crypto";
import { decide } from "./engine";
import { CourierError } from "./types";
import type {
  Catalog,
  Interpretation,
  Registry,
  Result,
  Submission,
} from "./types";
export const CLASSIFIER_VERSION = "product-interpreter-1";
function canonical(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (v && typeof v === "object")
    return (
      "{" +
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => JSON.stringify(k) + ":" + canonical(x))
        .join(",") +
      "}"
    );
  return JSON.stringify(v);
}
export const fingerprint = (s: Submission) =>
  createHash("sha256")
    .update(
      canonical(
        Object.fromEntries(
          Object.entries(s).filter(([key]) => key !== "requestId"),
        ),
      ),
    )
    .digest("hex");
export async function submit(
  s: Submission,
  deps: {
    catalog: Catalog;
    registry: Registry;
    interpret: (s: Submission, c: Catalog) => Promise<Interpretation[]>;
    now?: Date;
  },
): Promise<Result> {
  const hash = fingerprint(s);
  const previous = await deps.registry.get(s.requestId, hash);
  if (previous) return previous;
  let interpretations: Interpretation[];
  try {
    interpretations = await deps.interpret(s, deps.catalog);
  } catch {
    interpretations = s.products.map((p, i) => ({
      productIndex: i,
      name: p.description || "Producto",
      candidateIds: [],
      attributes: {},
      missing: [],
      evidence: [],
      issue: "CLASSIFIER_UNAVAILABLE",
    }));
  }
  const result = decide(
    s,
    deps.catalog,
    interpretations,
    deps.now,
    CLASSIFIER_VERSION +
      ":" +
      (deps.catalog.scope === "reference"
        ? "reference"
        : process.env.COURIER_OPENAI_MODEL || "gpt-4.1-mini"),
  );
  if (
    interpretations.some((i) => i.issue === "CLASSIFIER_UNAVAILABLE") &&
    result.status === "REQUIERE_REVISION"
  )
    result.reasons.unshift({
      code: "CLASSIFIER_UNAVAILABLE",
      message:
        "El asistente no pudo completar la identificación. El equipo de cotizaciones revisará el caso.",
    });
  try {
    return await deps.registry.commit({
      requestId: s.requestId,
      fingerprint: hash,
      submission: s,
      result,
      queue: "cotizaciones",
      environment: process.env.VERCEL_ENV || "development",
    });
  } catch (e) {
    if (e instanceof CourierError) throw e;
    throw new CourierError(
      "REGISTRY_UNAVAILABLE",
      "No pudimos guardar tu solicitud. Conservamos los datos: volvé a intentar.",
    );
  }
}
