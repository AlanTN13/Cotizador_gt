"use client";
import { useRef, useState } from "react";
import { courierResponseSchema, type CourierRequest, type CourierResponse } from "@/lib/courier/n8n-contract";
import QuotationLoading from "./quotation-loading";
import loadingStyles from "./quotation-loading.module.css";
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
  const [products, setProducts] = useState([{ link: "", descripcion: "" }]);
  const [operation, setOperation] = useState({ fob_usd: 0, cantidad: 1 });
  const [parcels, setParcels] = useState<CourierRequest["bultos"]>([blankParcel()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CourierResponse | null>(null);
  const attempt = useRef<CourierRequest | null>(null);
  const submitting = useRef(false);
  const resultArea = useRef<HTMLDivElement>(null);
  function edited() {
    setResult(null); setError("");
  }
  function updateProduct(i: number, patch: Partial<CourierRequest["productos"][number]>) {
    edited(); setProducts(p => p.map((v, j) => i === j ? { ...v, ...patch } : v));
  }
  function updateOperation(patch: Partial<typeof operation>) { edited(); setOperation(p => ({ ...p, ...patch })); }
  function updateParcel(i: number, patch: Partial<CourierRequest["bultos"][number]>) {
    edited(); setParcels(p => p.map((v, j) => i === j ? { ...v, ...patch } : v));
  }
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    const body: CourierRequest = { ...operation, productos: products.map(p => ({ ...p })), bultos: parcels.map(p => ({ ...p })),
      solicitud_id: attempt.current?.solicitud_id || crypto.randomUUID() };
    attempt.current = body;
    setResult(null); setError("");
    submitting.current = true; setBusy(true);
    try {
      const response = await fetch("/api/cotizador", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
      const data = await response.json();
      if (!response.ok) throw Error(data.mensaje || data.message || "No pudimos completar la solicitud. Tus datos se conservan.");
      const parsed = courierResponseSchema.safeParse(data);
      if (!parsed.success || parsed.data.solicitud_id !== body.solicitud_id) throw Error("La respuesta está incompleta. Tus datos se conservan para reintentar.");
      setResult(parsed.data);
      requestAnimationFrame(() => { resultArea.current?.scrollIntoView({ behavior: "smooth", block: "start" }); resultArea.current?.focus(); });
    } catch (e) {
      setError(e instanceof Error && !["TimeoutError", "AbortError", "SyntaxError", "TypeError"].includes(e.name)
        ? e.message : "No pudimos recibir la respuesta. Tus datos se conservan para reintentar.");
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
            Contanos qué querés traer y recibí una estimación aproximada de tu envío.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-600">
            Courier comercial aéreo · Mercadería nueva · Valores en USD
          </p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-10">
          <form onSubmit={send} className="min-w-0 rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_8px_40px_-20px_rgba(11,12,73,0.18)] sm:p-8 xl:p-10">
            <fieldset disabled={busy} className="min-w-0 space-y-10 [&:disabled>section]:opacity-60">
              <section aria-labelledby="products-heading">
                <h2 id="products-heading" className="text-2xl font-extrabold tracking-tight text-[#0b0c49]">1. Tus productos</h2>
                <p className="mt-2 text-sm text-slate-500">Agregá una descripción por producto. Si el link no está disponible, usamos la descripción.</p>
                {products.map((product, i) => <div key={i} className="mt-6 space-y-5 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between"><h3 className="font-semibold">Producto {i + 1}</h3>{products.length > 1 && <button type="button" className="text-sm text-red-700 underline" onClick={() => { edited(); setProducts(p => p.filter((_, j) => j !== i)); }}>Quitar producto {i + 1}</button>}</div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-[#0b0c49]">Link del producto {i + 1}
                    <input className={inputClass} type="url" maxLength={2048} placeholder="https://…" value={product.link} onChange={e => updateProduct(i, { link: e.target.value })} />
                  </label>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[.12em] text-[#0b0c49]">Descripción del producto {i + 1}
                    <textarea className={inputClass} rows={4} required maxLength={8000} placeholder="Qué es y para qué se usa…" value={product.descripcion} onChange={e => updateProduct(i, { descripcion: e.target.value })} />
                  </label>
                </div>)}
                <button type="button" className="mt-6 rounded-2xl border border-[#0b0c49] px-5 py-3.5 text-sm font-bold text-[#0b0c49] hover:bg-slate-50" onClick={() => { edited(); setProducts(p => [...p, { link: "", descripcion: "" }]); }}>+ Agregar otro producto</button>
              </section>
              <section aria-labelledby="operation-heading">
                <h2 id="operation-heading" className="text-2xl font-extrabold tracking-tight text-[#0b0c49]">2. Tu operación</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <NumberField label="Cantidad total de unidades" integer max={1000000} value={operation.cantidad} onChange={cantidad => updateOperation({ cantidad })} />
                  <NumberField label="Valor FOB total de la operación (USD)" max={1e9} value={operation.fob_usd} onChange={fob_usd => updateOperation({ fob_usd })} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">Ingresá el valor de toda la mercadería, sin flete ni seguro internacional.</p>
              </section>
              <section aria-labelledby="parcels-heading">
                <h2 id="parcels-heading" className="text-2xl font-extrabold tracking-tight text-[#0b0c49]">3. Los bultos</h2>
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
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-[#0b0c49]" role="note">
                <p className="font-extrabold">SON TARIFAS APROXIMADAS PARA QUE TE DES UNA IDEA. NO SON FINALES.</p>
                <p className="font-extrabold">NO PAGAR AL EXTERIOR HASTA NO TENER NUESTRO OK.</p>
                <p>Esta simulación no representa un presupuesto formal y queda sujeta a revisión y aprobación de Global Trip Logistics.</p>
              </div>
              {busy && <QuotationLoading />}
              {result && <div ref={resultArea} tabIndex={-1} className={`${loadingStyles.reveal} scroll-mt-32 rounded-3xl border border-slate-200 bg-slate-50/60 p-5 outline-none sm:p-6`} role="region" aria-label="Resultado del cotizador" data-status={result.status}>
                {result.status === "cotizado" ? <>
                  <p className="text-sm font-bold text-slate-500">TOTAL APROXIMADO</p>
                  <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#0b0c49]">{usd(result.total_usd)}</p>
                  <p className="mt-2 text-sm text-slate-500">No incluye la compra de mercadería.</p>
                  <dl className="mt-6 grid gap-5 sm:grid-cols-2">{[
                    ["Flete internacional", result.flete_internacional_usd], ["Handling con IVA", result.handling_con_iva_usd], ["Impuestos y tasas estimados", result.impuestos_y_tasas_usd],
                  ].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{usd(Number(value))}</dd></div>)}
                    <div><dt className="text-sm text-slate-500">Peso considerado</dt><dd className="mt-1 font-semibold">{result.peso_considerado_kg} kg</dd></div>
                  </dl>
                </> : <><h2 className="text-xl font-bold text-[#0b0c49]">No pudimos completar la estimación</h2><p className="mt-3 text-sm text-slate-600">{result.mensaje}</p></>}
                <p className="mt-5 break-all text-xs text-slate-500">Referencia: {result.solicitud_id}</p>
              </div>}
              {error && <div role="alert" className={`${loadingStyles.reveal} rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800`}>{error}</div>}
              <button type="submit" className="min-h-[4.5rem] w-full rounded-2xl bg-[#0b0c49] px-6 py-5 text-base font-extrabold text-white shadow-xl shadow-[#0b0c49]/10 transition-colors hover:bg-[#161865] disabled:cursor-wait sm:text-lg" disabled={busy}>
                {busy ? "Preparando tu estimación…" : error ? "Reintentar solicitud" : "Cotizar mi envío →"}
              </button>
              {result && <button type="button" className="w-full text-sm text-slate-600 underline" onClick={() => { setProducts([{ link: "", descripcion: "" }]); setOperation({ fob_usd: 0, cantidad: 1 }); setParcels([blankParcel()]); attempt.current = null; edited(); }}>Empezar otro caso</button>}
            </fieldset>
            <div aria-live="polite" className="sr-only">{!busy && result ? result.mensaje : ""}</div>
          </form>
          <aside className="rounded-3xl border border-slate-100 bg-slate-50 p-6 lg:sticky lg:top-36">
            <h2 className="font-extrabold tracking-tight text-[#0b0c49]">Tu envío, con claridad.</h2>
            <dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Valor de la mercadería</dt><dd className="mt-1 text-xl font-semibold">{usd(operation.fob_usd)}</dd></div><div><dt className="text-slate-500">Bultos</dt><dd className="mt-1 font-semibold">{parcels.reduce((a, p) => a + p.cantidad, 0)}</dd></div></dl>
            <p className="mt-6 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-500">Una estimación para darte una idea del costo de tu envío. El valor de la mercadería no está incluido en el total.</p>
          </aside>
        </div>
      </main>

  );
}
