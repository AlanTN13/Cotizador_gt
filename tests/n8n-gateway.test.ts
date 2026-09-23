import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cotizador/route";
import { courierRequestSchema, courierResponseSchema } from "@/lib/courier/n8n-contract";
vi.mock("@/lib/rate-limit", () => ({ isLimited: () => false }));
const body = { solicitud_id: "case-test", productos: [{ link: "https://www.alibaba.com/product-detail/test.html", descripcion: "Producto de prueba" }], fob_usd: 1000, cantidad: 100,
  bultos: [{ cantidad: 2, peso_kg: 12, largo_cm: 50, ancho_cm: 40, alto_cm: 40 }] };
const base = { solicitud_id: body.solicitud_id, mensaje: "Respuesta de prueba", codigo: "TEST" };
const quote = { ...base, status: "cotizado", total_usd: 1439.99, flete_internacional_usd: 646, handling_con_iva_usd: 90.75, impuestos_y_tasas_usd: 703.24, peso_considerado_kg: 34 };
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
    fetchMock.mockResolvedValue(Response.json({ ...quote, raw_headers: "test-secret-never-echo", auditoria: { productos: [{ DIE: 20 }], DIE_promedio: 20 }, SIM: "interno", DIE: 20 }));
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
  it("preserves all products and parcel groups", async () => {
    const data = { ...body, productos: [...body.productos, { link: "", descripcion: "Segundo producto" }], bultos: [...body.bultos, { cantidad: 3, peso_kg: 2, largo_cm: 10, ancho_cm: 20, alto_cm: 30 }] };
    expect((await POST(request(data))).status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(data);
  });
  it("passes technical error without any quotation fields", async () => {
    fetchMock.mockResolvedValue(Response.json({ ...quote, status: "error" }));
    expect(await (await POST(request())).json()).toEqual({ ...base, status: "error" });
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
    expect((await res.json()).codigo).toBe("N8N_AUTH_CONFIG_INCOMPLETE");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses half-configured auth", async () => {
    vi.stubEnv("N8N_COURIER_HEADER_NAME", "");
    expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["Host", "Content-Type", "bad\r\nheader"])("refuses invalid header %s", async name => {
    vi.stubEnv("N8N_COURIER_HEADER_NAME", name); expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("allows the authorized authenticated webhook in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect((await POST(request())).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers["X-Test-Auth"]).toBe("test-secret-never-echo");
  });
  it.each(["https://nexops.app.n8n.cloud/webhook-test/globaltrip-courier-v1", "https://other.example/webhook/globaltrip-courier-v1"])("refuses unauthorized URL %s", async url => {
    vi.stubEnv("N8N_COURIER_WEBHOOK_URL", url); expect((await POST(request())).status).toBe(503); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ ...body, fob_usd: 0 }, { ...body, bultos: [] }, { ...body, productos: [] }, { ...body, productos: [{ link: "", descripcion: "" }] }])("rejects invalid form data", async data => {
    expect((await POST(request(data))).status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses cross-origin requests", async () => { expect((await POST(request(body, { origin: "https://evil.example" }))).status).toBe(403); expect(fetchMock).not.toHaveBeenCalled(); });
  it("handles timeout without retrying upstream", async () => {
    fetchMock.mockRejectedValue(new DOMException("secret", "TimeoutError"));
    expect((await POST(request())).status).toBe(504); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([{}, { ...quote, solicitud_id: "wrong-case" }, { ...quote, total_usd: undefined }, { ...base, status: "falta_info", preguntas_faltantes: [] }, { ...base, status: "falta_info", preguntas_faltantes: [question, question] }])("rejects incomplete or mismatched response", async data => {
    fetchMock.mockResolvedValue(Response.json(data)); expect((await POST(request())).status).toBe(502);
  });
  it("handles non-JSON upstream success", async () => { fetchMock.mockResolvedValue(new Response("<html>secret</html>")); expect((await POST(request())).status).toBe(502); });
});

describe("canonical V1 workflow", () => {
  async function run(dies: number[], overrides = {}) {
    const { validateInput, parseAgent, calculate } = await import("../workflow/workflow-source.mjs");
    const validated = validateInput({ ...body, productos: dies.map((_,i) => ({ link: "", descripcion: `Producto ${i+1}` })), bultos: [{ cantidad: 1, peso_kg: 12, largo_cm: 50, ancho_cm: 40, alto_cm: 40 }], ...overrides }, "test");
    const parsed = parseAgent({ output: { productos: dies.map((DIE,i) => ({ indice: i+1, producto: `Producto ${i+1}`, clasificacion: null, SIM: null, DIE, evidencia: [], fundamento: "Estimación sintética de contrato" })) } }, validated);
    const result=calculate(parsed).respuesta;
    if (!("auditoria" in result)) throw new Error("Expected quotation");
    return result;
  }
  it("calculates with estimated duty and no link, SIM or evidence prerequisite", async () => {
    const result = await run([20]);
    expect(result).toMatchObject({ status: "cotizado", total_usd: 980.24, flete_internacional_usd: 384, handling_con_iva_usd: 90.75, impuestos_y_tasas_usd: 505.49, peso_considerado_kg: 16 });
    expect(courierResponseSchema.parse(result)).not.toHaveProperty("auditoria");
  });
  it("uses arithmetic mean for two products and preserves each individual estimate", async () => {
    const result = await run([20,18]);
    expect(result.auditoria.DIE_promedio).toBe(19);
    expect(result.auditoria.productos.map((p: {DIE:number}) => p.DIE)).toEqual([20,18]);
    expect(result.total_usd).toBe(967.71);
  });
  it("does not round the mean before tax calculation", async () => {
    const result = await run([20,18,35]);
    expect(result.auditoria.DIE_promedio).toBeCloseTo(73/3,12);
    const cif=1012.8*1.01, duties=cif*(73/3)/100, stats=cif*.03, iva=(cif+duties+stats)*.21;
    const taxes=(duties+stats+iva)*1.012;
    expect(result.impuestos_y_tasas_usd).toBe(Math.round(taxes*100)/100);
  });
  it.each([[20,24],[20.5,20],[30,20],[30.5,19],[31,19],[40,19]])("uses tariff for the whole weight %s", async (weight,rate) => {
    const result = await run([18], { bultos: [{ cantidad: 1, peso_kg: weight, largo_cm: 1, ancho_cm: 1, alto_cm: 1 }] });
    expect(result.flete_internacional_usd).toBe(weight*rate);
  });
  it("rounds aggregate volumetric weight only once", async () => {
    const result = await run([18], { bultos: [{cantidad:2,peso_kg:1,largo_cm:11,ancho_cm:10,alto_cm:50}] });
    expect(result.peso_considerado_kg).toBe(3);
  });
  it("reports malformed or missing model results only as technical error", async () => {
    const { validateInput, parseAgent } = await import("../workflow/workflow-source.mjs");
    const validated=validateInput(body,"test");
    for(const raw of [{error:"Failure"},{output:"bad JSON"},{output:{productos:[]}},{output:{productos:[{indice:1,producto:"x",DIE:null}]}}]) { const result=parseAgent(raw,validated); expect("respuesta" in result && result.respuesta.status).toBe("error"); }
  });
  it("exported nodes run the exact canonical implementation", async () => {
    const { readFileSync } = await import("node:fs");
    const workflow=JSON.parse(readFileSync(new URL("../workflow/GlobalTrip-Courier-V1.n8n.json",import.meta.url),"utf8"));
    const execute=(name: string, data: unknown, prepared?: unknown) => new Function("$input","$execution","$",workflow.nodes.find((n: {name:string;parameters:{jsCode:string}})=>n.name===name).parameters.jsCode)({first:()=>({json:data})},{id:"test"},()=>({first:()=>({json:prepared})}))[0].json;
    const validated=execute("Validar formulario",{body});
    const prepared=execute("Preparar agente",validated);
    expect(JSON.parse(prepared.agent_input).productos[0].descripcion).toBe(body.productos[0].descripcion);
    const parsed=execute("Validar salida del agente",{output:{productos:[{indice:1,producto:"Prueba",DIE:18}]}},prepared);
    const quoted=execute("Cotizador deterministico",parsed);
    expect(quoted.respuesta.status).toBe("cotizado");
    expect(quoted.respuesta.auditoria.DIE_promedio).toBe(18);
    // Position data belongs to the deterministic resolver, never to the AI prompt.
    expect(JSON.stringify(workflow.nodes.filter((n: { name: string })=>n.name!=='Cotizador deterministico'))).not.toContain('84145190100R');
  });
});
