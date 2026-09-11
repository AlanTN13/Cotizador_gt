import { NextResponse } from "next/server";
import { courierRequestSchema, courierResponseSchema } from "@/lib/courier/n8n-contract";
import { isLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;
const headers = { "Cache-Control": "no-store" };
class GatewayError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}
async function readLimited(body: ReadableStream<Uint8Array> | null, limit: number) {
  const reader = body?.getReader();
  if (!reader) return "";
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new GatewayError("PAYLOAD_TOO_LARGE", "La solicitud o respuesta es demasiado larga.", 413);
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
}
export async function POST(req: Request) {
  let solicitudId: string | undefined;
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin)
      throw new GatewayError("ORIGIN_INVALID", "Abrí el formulario desde GlobalTrip para continuar.", 403);
    if (isLimited(req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"))
      throw new GatewayError("RATE_LIMIT", "Esperá un minuto antes de volver a intentar.", 429);
    if (!req.headers.get("content-type")?.includes("application/json"))
      throw new GatewayError("INVALID_FORMAT", "El formato enviado no es válido.", 415);
    let raw;
    try { raw = JSON.parse(await readLimited(req.body, 500000)); }
    catch (error) {
      if (error instanceof GatewayError) throw error;
      throw new GatewayError("INVALID_JSON", "No pudimos leer los datos del formulario.", 400);
    }
    const parsed = courierRequestSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ code: "INVALID_FIELDS", message: "Revisá los campos señalados.",
      fields: parsed.error.issues.map(i => ({ path: i.path.join("."), message: i.message })),
    }, { status: 400, headers });
    solicitudId = parsed.data.solicitud_id;
    const urlValue = process.env.N8N_COURIER_WEBHOOK_URL;
    const headerName = process.env.N8N_COURIER_HEADER_NAME;
    const secret = process.env.N8N_COURIER_WEBHOOK_SECRET;
    if (!urlValue) throw new GatewayError("N8N_NOT_CONFIGURED", "La conexión del cotizador está pendiente de configuración.", 503);
    let url: URL;
    try { url = new URL(urlValue); } catch { throw new GatewayError("N8N_CONFIG_INVALID", "La conexión del cotizador necesita revisión.", 503); }
    // This integration is deliberately restricted to the authorized webhook, in Preview only.
    if (url.protocol !== "https:" || url.hostname !== "nexops.app.n8n.cloud" || url.pathname !== "/webhook/globaltrip-courier-v1" || url.port || url.username || url.password || url.search || url.hash || process.env.VERCEL_ENV === "production")
      throw new GatewayError("N8N_TEST_ONLY", "Esta conexión está habilitada únicamente para pruebas.", 503);
    // The imported workflow requires Header Auth. Do not submit cases until
    // both server-side credential fields have been configured in Preview.
    if (!headerName?.trim() || !secret?.trim() || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(headerName) || /^(host|content-type|content-length|connection|transfer-encoding|cookie)$/i.test(headerName) || /[\r\n]/.test(secret))
      throw new GatewayError("N8N_AUTH_CONFIG_INCOMPLETE", "Falta completar la autenticación del cotizador. Tus datos se conservan.", 503);
    const upstreamHeaders: Record<string, string> = { "Content-Type": "application/json" };
    upstreamHeaders[headerName] = secret;
    // No automatic retries: a test webhook can be single use.
    const response = await fetch(url, { method: "POST", headers: upstreamHeaders,
      body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(110000), redirect: "error", cache: "no-store" });
    console.info(JSON.stringify({ event: "courier_n8n_http", solicitud_id: solicitudId, http_status: response.status, authenticated: Boolean(secret) }));
    if (response.status === 401 || response.status === 403)
      throw new GatewayError("N8N_AUTH_REQUIRED", "El cotizador necesita completar su autenticación. Tus datos se conservan para reintentar.", 503);
    if (response.status === 404)
      throw new GatewayError("N8N_TEST_NOT_LISTENING", "La prueba todavía no está disponible. Cuando se habilite, podés reintentar con estos mismos datos.", 503);
    if (!response.ok) throw new GatewayError("N8N_UNAVAILABLE", "No pudimos completar el análisis. Tus datos se conservan; reintentá en unos minutos.");
    let result;
    try { result = courierResponseSchema.safeParse(JSON.parse(await readLimited(response.body, 200000))); }
    catch { throw new GatewayError("N8N_INVALID_RESPONSE", "Recibimos una respuesta incompleta. Tus datos se conservan para reintentar."); }
    if (!result.success || result.data.solicitud_id !== solicitudId)
      throw new GatewayError("N8N_INVALID_RESPONSE", "Recibimos una respuesta incompleta. Tus datos se conservan para reintentar.");
    // Only contract fields reach the browser, never raw upstream diagnostics.
    return NextResponse.json(result.data, { headers });
  } catch (e) {
    const error = e instanceof GatewayError ? e : e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")
      ? new GatewayError("N8N_TIMEOUT", "El análisis demoró más de lo esperado. Tus datos se conservan para reintentar.", 504)
      : new GatewayError("N8N_UNAVAILABLE", "No pudimos conectar con el cotizador. Tus datos se conservan para reintentar.");
    console.error(JSON.stringify({ event: "courier_n8n_error", solicitud_id: solicitudId, code: error.code }));
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status, headers });
  }
}
