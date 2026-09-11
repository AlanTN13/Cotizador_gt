import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cotizador/route";
import { courierRequestSchema, courierResponseSchema } from "@/lib/courier/n8n-contract";
vi.mock("@/lib/rate-limit", () => ({ isLimited: () => false }));
const body = { solicitud_id: "case-test", link: "https://www.alibaba.com/product-detail/test.html", descripcion: "Producto de prueba", fob_usd: 1000, cantidad: 100,
  bultos: [{ cantidad: 2, peso_kg: 12, largo_cm: 50, ancho_cm: 40, alto_cm: 40 }], aclaraciones: [] };
const base = { solicitud_id: body.solicitud_id, mensaje: "Respuesta de prueba", codigo: "TEST" };
const quote = { ...base, status: "cotizado", total_usd: 1439.99, flete_internacional_usd: 646, handling_con_iva_usd: 90.75, impuestos_y_tasas_usd: 703.24, peso_considerado_kg: 34, SIM: "84145190100R", DIE: 20 };
const question = { id: "material", pregunta: "¿De qué material es?", motivo: "Permite identificar la variante." };
const request = (data: unknown = body, headers = {}) => new Request("http://localhost:3018/api/cotizador", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3018", ...headers }, body: JSON.stringify(data) });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("N8N_COURIER_WEBHOOK_URL", "https://nexops.app.n8n.cloud/webhook/globaltrip-courier-v1");
  vi.stubEnv("N8N_COURIER_HEADER_NAME", "X-Test-Auth");
  vi.stubEnv("N8N_COURIER_WEBHOOK_SECRET", "test-secret-never-echo");
  vi.stubEnv("VERCEL_ENV", "preview");
  fetchMock = vi.fn().mockResolvedValue(Response.json(quote)); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("server-side n8n gateway", () => {
  it("forwards only the workflow contract, adds auth on the server and filters extra response fields", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...quote, raw_headers: "test-secret-never-echo" }));
    const res = await POST(request({ ...body, SIM: "FAKE", DIE: 0, total_usd: 0, webhook_url: "https://evil.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(quote);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(process.env.N8N_COURIER_WEBHOOK_URL);
    expect(options.headers["X-Test-Auth"]).toBe("test-secret-never-echo");
    expect(options.redirect).toBe("error");
    expect(JSON.parse(options.body)).toEqual(body);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it.each(["revision", "no_apto"])("discards prices in %s", async status => {
    fetchMock.mockResolvedValue(Response.json({ ...quote, status }));
    expect(await (await POST(request())).json()).toEqual({ ...base, status });
  });
  it("preserves ID, parcel groups and accumulated clarifications", async () => {
    const data = { ...body, aclaraciones: [{ pregunta: question.pregunta, respuesta: "Acero inoxidable" }], bultos: [...body.bultos, { cantidad: 3, peso_kg: 2, largo_cm: 10, ancho_cm: 20, alto_cm: 30 }] };
    fetchMock.mockResolvedValue(Response.json({ ...base, status: "falta_info", preguntas_faltantes: [question] }));
    expect((await POST(request(data))).status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(data);
  });
  it.each([401, 403, 404, 500])("sanitizes upstream HTTP %s without leaking raw diagnostics", async status => {
    fetchMock.mockResolvedValue(new Response("test-secret-never-echo https://nexops.app.n8n.cloud", { status }));
    const res = await POST(request());
    expect(res.status).toBe(status === 500 ? 502 : 503);
    expect(await res.text()).not.toMatch(/test-secret|nexops\.app/);
  });
  it.each([["", ""], [" ", " "], ["X-Test-Auth", " "]])("requires configured Header Auth without calling n8n (%j)", async (name, value) => {
    vi.stubEnv("N8N_COURIER_HEADER_NAME", name); vi.stubEnv("N8N_COURIER_WEBHOOK_SECRET", value);
    const res = await POST(request());
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe("N8N_AUTH_CONFIG_INCOMPLETE");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses half-configured auth", async () => {
    vi.stubEnv("N8N_COURIER_HEADER_NAME", "");
    expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["Host", "Content-Type", "bad\r\nheader"])("refuses invalid header %s", async name => {
    vi.stubEnv("N8N_COURIER_HEADER_NAME", name); expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses production runtime", async () => {
    vi.stubEnv("VERCEL_ENV", "production"); expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["https://nexops.app.n8n.cloud/webhook-test/globaltrip-courier-v1", "https://other.example/webhook/globaltrip-courier-v1"])("refuses unauthorized URL %s", async url => {
    vi.stubEnv("N8N_COURIER_WEBHOOK_URL", url); expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ ...body, fob_usd: 0 }, { ...body, bultos: [] }, { ...body, link: "http://localhost" }, { ...body, aclaraciones: [{ pregunta: "x", respuesta: "" }] }])("rejects invalid form data", async data => {
    expect((await POST(request(data))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses cross-origin requests", async () => { expect((await POST(request(body, { origin: "https://evil.example" }))).status).toBe(403); expect(fetchMock).not.toHaveBeenCalled(); });
  it("handles timeout without retrying upstream", async () => {
    fetchMock.mockRejectedValue(new DOMException("secret", "TimeoutError"));
    expect((await POST(request())).status).toBe(504); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([{}, { ...quote, solicitud_id: "wrong-case" }, { ...quote, DIE: undefined }, { ...base, status: "falta_info", preguntas_faltantes: [] }, { ...base, status: "falta_info", preguntas_faltantes: [question, question] }])("rejects incomplete or mismatched response", async data => {
    fetchMock.mockResolvedValue(Response.json(data)); expect((await POST(request())).status).toBe(502);
  });
  it("handles non-JSON upstream success", async () => { fetchMock.mockResolvedValue(new Response("<html>secret</html>")); expect((await POST(request())).status).toBe(502); });
});

describe("literal imported workflow compatibility", () => {
  it("accepts literal validation and calculator responses, including follow-up", async () => {
    // Run the very functions inlined into the supplied n8n JSON, not a second calculator.
    const { validateInput, calculate } = await import("./fixtures/n8n-workflow-source.mjs");
    const validated = validateInput(body, "test");
    expect(validated.siguiente).toBe("agente");
    if (!("solicitud" in validated)) throw Error("Workflow rejected fixture");
    expect(courierRequestSchema.parse(validated.solicitud).solicitud_id).toBe(body.solicitud_id);
    const calculated = calculate({ ...validated, siguiente: "cotizar", respuesta: { ...validated.respuesta, aptitud_courier: "apto", SIM: quote.SIM, DIE: quote.DIE } });
    expect(courierResponseSchema.parse(calculated.respuesta).status).toBe("cotizado");
    const incomplete = validateInput({ ...body, descripcion: "" }, "test");
    expect(courierResponseSchema.parse(incomplete.respuesta).status).toBe("falta_info");
  });
});
