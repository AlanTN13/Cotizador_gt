"use client";
import { useRef, useState } from "react";
import { courierResponseSchema, type CourierRequest, type CourierResponse, type Clarification } from "@/lib/courier/n8n-contract";
const blankParcel = () => ({ cantidad: 1, peso_kg: 0, largo_cm: 0, ancho_cm: 0, alto_cm: 0 });
const usd = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-medium normal-case tracking-normal text-slate-900 outline-none transition-shadow placeholder:text-slate-400 focus:border-[#0b0c49] focus:ring-2 focus:ring-[#0b0c49]/10";
function NumberField({
  label,
  value,
  onChange,
  integer = false,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  integer?: boolean;
  max?: number;
}) {
  return (
    <label className="grid content-start text-[11px] font-extrabold uppercase tracking-[.12em] text-[#0b0c49]">
      <span className="sm:min-h-[2.5rem]">{label}</span>
      <input
        className={inputClass}
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        required
        min={integer ? 1 : 0.01}
        max={max}
        step={integer ? 1 : "0.01"}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
export default function CourierForm() {
  const [product, setProduct] = useState({ link: "", descripcion: "", fob_usd: 0, cantidad: 1 });
  const [parcels, setParcels] = useState<CourierRequest["bultos"]>([blankParcel()]);
  const [clarifications, setClarifications] = useState<Clarification[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CourierResponse | null>(null);
  const attempt = useRef<CourierRequest | null>(null);
  const submitting = useRef(false);
  const resultArea = useRef<HTMLDivElement>(null);
  function edited() {
    setResult(null); setError("");
    // Corrections to the same case retain its ID and prior clarifications.
    // Only the explicit new-case button clears them.
  }
  function updateProduct(patch: Partial<typeof product>) { edited(); setProduct(p => ({ ...p, ...patch })); }
  function updateParcel(i: number, patch: Partial<CourierRequest["bultos"][number]>) {
    edited(); setParcels(p => p.map((v, j) => i === j ? { ...v, ...patch } : v));
  }
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    const pending = result?.status === "falta_info" ? result.preguntas_faltantes : [];
    const added = pending.map(q => ({ pregunta: q.pregunta, respuesta: (answers[q.id] || "").trim() }));
    if (added.some(a => !a.respuesta)) { setError("Respondé las preguntas para continuar."); return; }
    const accumulated = [...clarifications, ...added];
    if (accumulated.length > 50) { setError("Este caso necesita revisión de GlobalTrip antes de continuar."); return; }
    const body: CourierRequest = { ...product, bultos: parcels.map(p => ({ ...p })),
      solicitud_id: attempt.current?.solicitud_id || crypto.randomUUID(), aclaraciones: accumulated };
    // Persist the exact attempted payload before sending. A network retry cannot
    // lose the case ID or append the same answers a second time.
    attempt.current = body;
    setClarifications(accumulated); setAnswers({}); setResult(null); setError("");
    submitting.current = true; setBusy(true);
    try {
      const response = await fetch("/api/cotizador", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || "No pudimos completar la solicitud. Tus datos se conservan.");
      const parsed = courierResponseSchema.safeParse(data);
      if (!parsed.success || parsed.data.solicitud_id !== body.solicitud_id) throw Error("La respuesta está incompleta. Tus datos se conservan para reintentar.");
      setResult(parsed.data);
      requestAnimationFrame(() => { resultArea.current?.scrollIntoView({ behavior: "smooth", block: "start" }); resultArea.current?.focus(); });
    } catch (e) {
      setError(e instanceof Error && !["TimeoutError", "AbortError", "SyntaxError", "TypeError"].includes(e.name)
        ? e.message : "No pudimos recibir la respuesta. Tus datos y aclaraciones se conservan para reintentar.");
    } finally { submitting.current = false; setBusy(false); }
  }
  return (
      <main id="cotizador" className="mx-auto w-full max-w-7xl px-6 py-12 md:px-12 md:py-16 lg:py-20">
        <div className="mb-10 max-w-3xl md:mb-12">
          <p className="mb-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#0b0c49]">
            China → Buenos Aires
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-[#0b0c49] md:text-5xl lg:text-[3.5rem]">
            Tu próxima importación empieza acá.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-500 md:text-lg">
            Contanos qué querés traer. Revisamos el producto y las condiciones
            de tu envío para ofrecerte una cotización o acompañarte con un
            asesor.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-600">
            Courier comercial aéreo · Mercadería nueva · Valores en USD
          </p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-10">
          <form onSubmit={send} className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_40px_-20px_rgba(11,12,73,0.18)] sm:p-8 xl:p-10">
            <fieldset disabled={busy} className="min-w-0 space-y-10 disabled:opacity-70">
              <section aria-labelledby="products-heading">
                <h2 id="products-heading" className="text-2xl font-extrabold tracking-tight text-[#0b0c49]">1. Tu producto</h2>
                <p className="mt-2 text-sm text-slate-500">Cotizá un producto por caso. Indicá el link y la variante exacta que querés traer.</p>
                <div className="mt-6 space-y-5 border-t border-slate-100 pt-6">
                  <label className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-[#0b0c49]">Link del producto
                    <input className={inputClass} type="url" required maxLength={2048} pattern="https://.*" placeholder="https://…" value={product.link} onChange={e => updateProduct({ link: e.target.value })} />
                  </label>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-[#0b0c49]">Descripción del producto
                    <textarea className={inputClass} rows={4} required maxLength={8000} placeholder="Qué es, para qué se usa, material, marca y modelo…" value={product.descripcion} onChange={e => updateProduct({ descripcion: e.target.value })} />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField label="Cantidad de unidades" integer max={1000000} value={product.cantidad} onChange={cantidad => updateProduct({ cantidad })} />
                    <NumberField label="Valor FOB total de este producto (USD)" max={1e9} value={product.fob_usd} onChange={fob_usd => updateProduct({ fob_usd })} />
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">Ingresá el valor de todas las unidades, sin flete ni seguro internacional.</p>
                </div>
              </section>
              <section aria-labelledby="parcels-heading">
                <h2 id="parcels-heading" className="text-2xl font-extrabold tracking-tight text-[#0b0c49]">2. Los bultos</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">Indicá las medidas externas y el peso de cada caja embalada. Agrupá las que sean iguales.</p>
                {parcels.map((p, i) => (
                  <div key={i} className="mt-6 border-t border-slate-100 pt-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold">Grupo de bultos {i + 1}</h3>
                      {parcels.length > 1 && <button type="button" className="text-sm text-red-700 underline" onClick={() => { edited(); setParcels(v => v.filter((_, j) => j !== i)); }}>Quitar grupo {i + 1}</button>}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <NumberField label="Cantidad de cajas iguales" integer max={1000} value={p.cantidad} onChange={cantidad => updateParcel(i, { cantidad })} />
                      <NumberField label="Peso bruto de cada caja (kg)" max={1e9} value={p.peso_kg} onChange={peso_kg => updateParcel(i, { peso_kg })} />
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      {(["largo_cm", "ancho_cm", "alto_cm"] as const).map((key, j) => <NumberField key={key} label={["Largo (cm)", "Ancho (cm)", "Alto (cm)"][j]} max={1e9} value={p[key]} onChange={n => updateParcel(i, { [key]: n })} />)}
                    </div>
                  </div>
                ))}
                {parcels.length < 100 && <button type="button" className="mt-6 rounded-2xl border border-[#0b0c49] px-5 py-3.5 text-sm font-bold text-[#0b0c49] transition-colors hover:bg-slate-50" onClick={() => { edited(); setParcels(p => [...p, blankParcel()]); }}>+ Agregar otro grupo</button>}
              </section>
              {clarifications.length > 0 && <details className="rounded-xl bg-slate-50 p-4 text-sm">
                <summary className="cursor-pointer font-semibold">Aclaraciones de este caso ({clarifications.length})</summary>
                <dl className="mt-3 space-y-3">{clarifications.map((a, i) => <div key={i}><dt className="font-medium">{a.pregunta}</dt><dd className="mt-1 whitespace-pre-wrap">{a.respuesta}</dd></div>)}</dl>
              </details>}
              {result && <div ref={resultArea} tabIndex={-1} className="scroll-mt-32 rounded-3xl border border-slate-200 bg-slate-50/60 p-5 outline-none sm:p-6" role="region" aria-label="Resultado del cotizador" data-status={result.status}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{ {cotizado: "Cotizado", falta_info: "Falta información", revision: "Revisión", no_apto: "No apto"}[result.status] }</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0b0c49]">{ {cotizado: "Tu cotización está lista", falta_info: "Unos datos más para continuar", revision: "Este caso necesita revisión", no_apto: "Este producto no es apto para este courier"}[result.status] }</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{result.mensaje}</p>
                {result.status === "falta_info" && <div className="mt-5 space-y-5">{result.preguntas_faltantes.map(q => <label key={q.id} className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-[#0b0c49]">{q.pregunta}
                  <span className="mt-1 block text-sm font-normal normal-case tracking-normal text-slate-500">{q.motivo}</span>
                  <textarea className={inputClass} required rows={2} maxLength={3000} value={answers[q.id] || ""} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} />
                </label>)}</div>}
                {result.status === "cotizado" && <>
                  <dl className="mt-6 grid gap-5 sm:grid-cols-2">{[
                    ["Flete internacional", result.flete_internacional_usd], ["Handling con IVA", result.handling_con_iva_usd], ["Impuestos y tasas", result.impuestos_y_tasas_usd],
                  ].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{usd(Number(value))}</dd></div>)}</dl>
                  <div className="mt-6 rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Total aproximado (USD)</p><p className="mt-2 text-3xl font-extrabold tracking-tight text-[#0b0c49]">{usd(result.total_usd)}</p><p className="mt-2 text-sm text-slate-500">No incluye la compra de mercadería.</p></div>
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3"><div><dt>Peso considerado</dt><dd className="mt-1 font-semibold">{result.peso_considerado_kg} kg</dd></div><div><dt>SIM</dt><dd className="mt-1 break-all font-semibold">{result.SIM}</dd></div><div><dt>DIE</dt><dd className="mt-1 font-semibold">{result.DIE}%</dd></div></dl>
                </>}
                <p className="mt-5 break-all text-xs text-slate-500">Referencia: {result.solicitud_id}</p>
              </div>}
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
              <button type="submit" className="min-h-[4.5rem] w-full rounded-2xl bg-[#0b0c49] px-6 py-5 text-base font-extrabold text-white shadow-xl shadow-[#0b0c49]/10 transition-colors hover:bg-[#161865] disabled:cursor-wait sm:text-lg" disabled={busy}>
                {busy ? "Analizando el producto y calculando…" : error ? "Reintentar solicitud" : result?.status === "falta_info" ? "Enviar aclaraciones y continuar →" : "Cotizar mi envío →"}
              </button>
              {(result || clarifications.length > 0) && <button type="button" className="w-full text-sm text-slate-600 underline" onClick={() => { setProduct({ link: "", descripcion: "", fob_usd: 0, cantidad: 1 }); setParcels([blankParcel()]); setClarifications([]); setAnswers({}); attempt.current = null; edited(); }}>Empezar otro caso</button>}
            </fieldset>
            <div aria-live="polite" className="sr-only">{busy ? "Estamos procesando tu solicitud." : result ? result.mensaje : ""}</div>
          </form>
          <aside className="rounded-3xl border border-slate-100 bg-slate-50 p-6 lg:sticky lg:top-36">
            <h2 className="font-extrabold tracking-tight text-[#0b0c49]">Tu envío, con claridad.</h2>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Valor de la mercadería</dt><dd className="mt-1 text-xl font-semibold">{usd(product.fob_usd)}</dd></div><div><dt className="text-slate-500">Bultos</dt><dd className="mt-1 font-semibold">{parcels.reduce((a, p) => a + p.cantidad, 0)}</dd></div></dl>
            <p className="mt-6 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-500">La aptitud depende del producto y sus condiciones. Si necesitamos confirmar un dato, te lo preguntamos acá mismo.</p>
          </aside>
        </div>
      </main>

  );
}
