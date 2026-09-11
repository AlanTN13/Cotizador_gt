import { NextResponse } from "next/server";
import { submissionSchema } from "@/lib/courier/schema";
import { getCatalog } from "@/lib/courier/catalog";
import { interpret } from "@/lib/courier/classifier";
import { SheetRegistry } from "@/lib/courier/registry";
import { submit } from "@/lib/courier/service";
import { CourierError } from "@/lib/courier/types";
import { isLimited } from "@/lib/rate-limit";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const origin = req.headers.get("origin");
    if (
      origin &&
      new URL(origin).host !==
        (req.headers.get("host") || new URL(req.url).host)
    )
      throw new CourierError(
        "ORIGIN_INVALID",
        "Abrí el formulario desde GlobalTrip para continuar.",
        403,
      );
    if (
      isLimited(
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
      )
    )
      throw new CourierError(
        "RATE_LIMIT",
        "Esperá un minuto antes de volver a intentar.",
        429,
      );
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new CourierError(
        "INVALID_FORMAT",
        "El formato enviado no es válido.",
        415,
      );
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = req.body?.getReader();
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 50000) {
            await reader.cancel();
            throw new CourierError(
              "TOO_LARGE",
              "La solicitud es demasiado larga. Acortá las descripciones.",
              413,
            );
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new CourierError(
        "INVALID_JSON",
        "No pudimos leer los datos. Volvé a intentar.",
        400,
      );
    }
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_FIELDS",
          message: "Revisá los campos señalados.",
          fields: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400, headers },
      );
    if (parsed.data.website)
      throw new CourierError(
        "INVALID_REQUEST",
        "No pudimos procesar la solicitud.",
        400,
      );
    const result = await submit(parsed.data, {
      catalog: getCatalog(parsed.data.reference),
      registry: new SheetRegistry(),
      interpret,
    });
    console.info(
      JSON.stringify({
        event: "courier_result",
        requestId: result.requestId,
        status: result.status,
        catalogVersion: result.catalogVersion,
        simulation: result.simulation,
      }),
    );
    return NextResponse.json({ ok: true, result }, { headers });
  } catch (e) {
    const error =
      e instanceof CourierError
        ? e
        : new CourierError(
            "TEMPORARY_ERROR",
            "No pudimos completar la solicitud. Tus datos siguen guardados en el formulario.",
          );
    console.error(JSON.stringify({ event: "courier_error", code: error.code }));
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message },
      { status: error.httpStatus, headers },
    );
  }
}
