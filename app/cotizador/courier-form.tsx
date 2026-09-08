"use client";
import { useRef, useState } from "react";
import type { Parcel, Product, Result } from "@/lib/courier/types";
const blankProduct = (): Product => ({
  description: "",
  url: "",
  quantity: 1,
  valueUsd: 0,
  origin: "China",
  attributes: {},
});
const blankParcel = (): Parcel => ({
  quantity: 1,
  width: 0,
  height: 0,
  length: 0,
  grossWeight: 0,
});
const usd = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";
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
    <label className="grid content-start text-sm font-medium text-slate-700">
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
export default function CourierForm({
  reference = false,
}: {
  reference?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([blankProduct()]);
  const [parcels, setParcels] = useState<Parcel[]>([blankParcel()]);
  const [contact, setContact] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const attempt = useRef<{ payload: string; id: string } | null>(null),
    submitting = useRef(false),
    resultArea = useRef<HTMLDivElement>(null);
  const updateProduct = (i: number, patch: Partial<Product>) => {
    setResult(null);
    setProducts((p) => p.map((v, j) => (i === j ? { ...v, ...patch } : v)));
  };
  const updateParcel = (i: number, patch: Partial<Parcel>) => {
    setResult(null);
    setParcels((p) => p.map((v, j) => (i === j ? { ...v, ...patch } : v)));
  };
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    const body = {
      products,
      parcels,
      contact,
      route: "CN-BUE",
      condition: "new",
      purpose: "commercial",
      reference,
      website: String(new FormData(e.currentTarget).get("website") || ""),
    };
    try {
      const bytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(body)),
      );
      const payload = Array.from(new Uint8Array(bytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (!attempt.current) {
        try {
          attempt.current = JSON.parse(
            sessionStorage.getItem("courier-attempt-v1") || "null",
          );
        } catch {}
      }
      if (attempt.current?.payload !== payload)
        attempt.current = { payload, id: crypto.randomUUID() };
      try {
        sessionStorage.setItem(
          "courier-attempt-v1",
          JSON.stringify(attempt.current),
        );
      } catch {}
      const response = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, requestId: attempt.current.id }),
        signal: AbortSignal.timeout(65000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.result?.recorded)
        throw Error(
          data.message ||
            "No pudimos confirmar el registro. Volvé a intentar con estos mismos datos.",
        );
      setResult(data.result);
      requestAnimationFrame(() => {
        resultArea.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        resultArea.current?.focus();
      });
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "La respuesta demoró más de lo esperado. Volvé a intentar: recuperaremos la misma solicitud si ya se guardó.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const total = products.reduce((a, p) => a + p.valueUsd, 0);
  return (
    <div className="min-h-screen bg-[#f5f6fa] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <a
            href="https://globaltriplog.com"
            aria-label="GlobalTrip, ir al inicio"
          >
            <img
              src="/logo.png"
              width="84"
              height="64"
              alt="GlobalTrip"
              className="h-16 w-auto"
            />
          </a>
          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-5 text-sm font-semibold"
          >
            <a className="hover:underline" href="https://globaltriplog.com">
              Inicio
            </a>
            <a
              className="hidden hover:underline sm:inline"
              href="https://globaltriplog.com/servicios"
            >
              Servicios
            </a>
            <span className="text-[#10104e]" aria-current="page">
              Courier aéreo
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        {reference && (
          <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
            <strong>Entorno de referencia técnica.</strong> Los productos, tasas
            y precios de esta pantalla son ficticios. No tienen validez
            comercial.
          </div>
        )}
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-slate-500">
            China → Buenos Aires
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#10104e] md:text-5xl">
            Tu próxima importación empieza acá.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-500">
            Contanos qué querés traer. Revisamos el producto y las condiciones
            de tu envío para ofrecerte una cotización o acompañarte con un
            asesor.
          </p>
          <p className="mt-4 text-sm font-medium text-slate-600">
            Courier comercial aéreo · Mercadería nueva · Valores en USD
          </p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_290px]">
          <form
            onSubmit={send}
            className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-8"
          >
            <fieldset
              disabled={busy}
              className="min-w-0 space-y-9 disabled:opacity-70"
            >
              <section aria-labelledby="products-heading">
                <h2
                  id="products-heading"
                  className="text-2xl font-bold text-[#10104e]"
                >
                  1. Tus productos
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Agregá un producto por variante o condición. Podés compartir
                  un link, una descripción o ambos.
                </p>
                {reference && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "Muestra técnica A",
                      "Muestra técnica B",
                      "Muestra técnica no apta",
                      "Muestra técnica sin tasa",
                      "Producto ambiguo",
                    ].map((name) => (
                      <button
                        className="rounded-lg border border-amber-300 px-3 py-2 text-xs"
                        type="button"
                        key={name}
                        onClick={() => {
                          setProducts([
                            {
                              ...blankProduct(),
                              description: name,
                              valueUsd: 100,
                            },
                          ]);
                          setParcels([
                            {
                              quantity: 1,
                              width: 10,
                              height: 10,
                              length: 10,
                              grossWeight: 2,
                            },
                          ]);
                          setResult(null);
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                {products.map((p, i) => (
                  <div
                    key={i}
                    className="mt-6 space-y-4 border-t border-slate-100 pt-5"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Producto {i + 1}</h3>
                      {products.length > 1 && (
                        <button
                          type="button"
                          className="text-sm text-red-700 underline"
                          onClick={() =>
                            setProducts((v) => v.filter((_, j) => j !== i))
                          }
                        >
                          Quitar producto {i + 1}
                        </button>
                      )}
                    </div>
                    <label className="block text-sm font-medium">
                      Descripción del producto
                      <textarea
                        className={inputClass}
                        rows={3}
                        maxLength={2500}
                        required={!p.url}
                        minLength={3}
                        placeholder="Qué es, para qué se usa, material, marca y modelo…"
                        value={p.description}
                        onChange={(e) =>
                          updateProduct(i, { description: e.target.value })
                        }
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Link del producto{" "}
                      <span className="font-normal text-slate-400">
                        (opcional)
                      </span>
                      <input
                        className={inputClass}
                        type="url"
                        maxLength={2000}
                        placeholder="https://…"
                        value={p.url}
                        onChange={(e) =>
                          updateProduct(i, { url: e.target.value })
                        }
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <NumberField
                        label="Cantidad de unidades"
                        value={p.quantity}
                        integer
                        max={100000}
                        onChange={(quantity) => updateProduct(i, { quantity })}
                      />
                      <NumberField
                        label="Valor FOB total de este producto (USD)"
                        value={p.valueUsd}
                        onChange={(valueUsd) => updateProduct(i, { valueUsd })}
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Ingresá el valor de todas las unidades de este producto,
                      sin flete ni seguro internacional.
                    </p>
                    <label className="block text-sm font-medium">
                      País de fabricación
                      <select
                        className={inputClass}
                        value={p.origin}
                        onChange={(e) =>
                          updateProduct(i, { origin: e.target.value })
                        }
                      >
                        <option>China</option>
                        <option value="Por confirmar">
                          No lo sé / otro origen
                        </option>
                      </select>
                    </label>
                    {Object.keys(p.attributes).length > 0 && (
                      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                        {Object.entries(p.attributes).map(([k, v]) => (
                          <label key={k} className="block text-sm font-medium">
                            {k}
                            <input
                              className={inputClass}
                              required
                              maxLength={300}
                              value={v}
                              onChange={(e) =>
                                updateProduct(i, {
                                  attributes: {
                                    ...p.attributes,
                                    [k]: e.target.value,
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {products.length < 10 && (
                  <button
                    type="button"
                    className="mt-5 rounded-xl border border-[#10104e] px-4 py-3 text-sm font-semibold text-[#10104e]"
                    onClick={() => setProducts((p) => [...p, blankProduct()])}
                  >
                    + Agregar otro producto
                  </button>
                )}
              </section>
              <section aria-labelledby="parcels-heading">
                <h2
                  id="parcels-heading"
                  className="text-2xl font-bold text-[#10104e]"
                >
                  2. Los bultos
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Indicá las medidas externas y el peso de cada caja embalada.
                  Agrupá las que sean iguales.
                </p>
                {parcels.map((p, i) => (
                  <div key={i} className="mt-6 border-t border-slate-100 pt-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-semibold">Grupo de bultos {i + 1}</h3>
                      {parcels.length > 1 && (
                        <button
                          type="button"
                          className="text-sm text-red-700 underline"
                          onClick={() =>
                            setParcels((v) => v.filter((_, j) => j !== i))
                          }
                        >
                          Quitar grupo {i + 1}
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <NumberField
                        label="Cantidad de cajas iguales"
                        integer
                        max={100}
                        value={p.quantity}
                        onChange={(quantity) => updateParcel(i, { quantity })}
                      />
                      <NumberField
                        label="Peso bruto de cada caja (kg)"
                        value={p.grossWeight}
                        onChange={(grossWeight) =>
                          updateParcel(i, { grossWeight })
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      {(["length", "width", "height"] as const).map((k, j) => (
                        <NumberField
                          key={k}
                          label={["Largo (cm)", "Ancho (cm)", "Alto (cm)"][j]}
                          value={p[k]}
                          onChange={(n) => updateParcel(i, { [k]: n })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {parcels.length < 20 && (
                  <button
                    type="button"
                    className="mt-5 rounded-xl border border-[#10104e] px-4 py-3 text-sm font-semibold text-[#10104e]"
                    onClick={() => setParcels((p) => [...p, blankParcel()])}
                  >
                    + Agregar otro grupo
                  </button>
                )}
              </section>
              <section>
                <h2 className="text-2xl font-bold text-[#10104e]">
                  3. Cómo contactarte
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Si hace falta revisar algún detalle, el equipo de cotizaciones
                  podrá continuar la gestión.
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Nombre
                    <input
                      className={inputClass}
                      required
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={contact.name}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, name: e.target.value }))
                      }
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Email
                    <input
                      className={inputClass}
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      value={contact.email}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, email: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <div className="hidden" aria-hidden="true">
                  <label>
                    Website
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                </div>
              </section>
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                className="w-full rounded-xl bg-[#10104e] px-6 py-4 font-semibold text-white hover:bg-[#24246a] disabled:cursor-wait"
                disabled={busy}
              >
                {busy
                  ? "Revisando y guardando tu solicitud…"
                  : error
                    ? "Reintentar solicitud"
                    : "Revisar mi envío →"}
              </button>
            </fieldset>
            <div aria-live="polite" className="sr-only">
              {busy ? "Estamos procesando tu solicitud." : ""}
            </div>
          </form>
          <aside className="rounded-2xl border border-slate-200 p-6 lg:sticky lg:top-6">
            <h2 className="font-bold text-[#10104e]">
              Tu envío, con claridad.
            </h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Valor de la mercadería</dt>
                <dd className="mt-1 text-xl font-semibold">{usd(total)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Bultos</dt>
                <dd className="mt-1 font-semibold">
                  {parcels.reduce((a, p) => a + p.quantity, 0)}
                </dd>
              </div>
            </dl>
            <p className="mt-6 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-500">
              Hasta USD 3.000 FOB por envío y 50 kg brutos por bulto. La aptitud
              también depende del producto y sus condiciones.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Si necesitamos confirmar un dato, un asesor revisará tu solicitud
              antes de darte un precio.
            </p>
          </aside>
        </div>
        {result && (
          <div
            ref={resultArea}
            tabIndex={-1}
            className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-6 outline-none md:p-10"
            role="status"
          >
            {result.simulation && (
              <p className="mb-4 font-bold text-amber-800">
                SIMULACIÓN TÉCNICA · Sin validez comercial
              </p>
            )}
            <p className="mb-3 text-sm font-semibold text-emerald-700">
              ✓ Solicitud guardada
            </p>
            <h2 className="text-2xl font-bold text-[#10104e]">
              {result.status === "COTIZADO"
                ? "Tu cotización está lista"
                : result.status === "NO_APTO_COURIER"
                  ? "Este envío necesita otra solución"
                  : "Vamos a revisar tu envío"}
            </h2>
            <p className="mt-3 text-slate-500">
              {result.status === "REQUIERE_REVISION"
                ? "El equipo de cotizaciones recibió tus datos y continuará la gestión."
                : result.status === "NO_APTO_COURIER"
                  ? "Con los datos ingresados, el envío no reúne las condiciones de este courier. El equipo podrá orientarte sobre los próximos pasos."
                  : "El cálculo corresponde a los productos y bultos que declaraste."}
            </p>
            {result.reasons.length > 0 && (
              <ul className="mt-5 list-disc space-y-2 pl-5 text-sm">
                {result.reasons.map((r, i) => (
                  <li key={i}>
                    {r.productIndex !== undefined
                      ? `Producto ${r.productIndex + 1}: `
                      : ""}
                    {r.message}
                  </li>
                ))}
              </ul>
            )}
            {Boolean(result.requestedAttributes?.length) && (
              <button
                type="button"
                className="mt-4 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold"
                onClick={() => {
                  const fields = result.requestedAttributes || [];
                  setProducts((current) =>
                    current.map((p, i) => ({
                      ...p,
                      attributes: {
                        ...p.attributes,
                        ...Object.fromEntries(
                          fields
                            .filter((f) => f.productIndex === i)
                            .map((f) => [f.key, p.attributes[f.key] || ""]),
                        ),
                      },
                    })),
                  );
                  setResult(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Completar los datos técnicos solicitados
              </button>
            )}
            {result.calculation && (
              <>
                <dl className="mt-6 grid gap-5 sm:grid-cols-3">
                  {[
                    ["Flete aéreo", result.calculation.freightUsd],
                    ["Seguro", result.calculation.insuranceUsd],
                    [
                      "Gestión e IVA",
                      result.calculation.handlingUsd +
                        result.calculation.handlingVatUsd,
                    ],
                    ["Tributos de los productos", result.calculation.taxesUsd],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-slate-500">{label}</dt>
                      <dd className="mt-1 font-semibold">
                        {usd(Number(value))}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 rounded-xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">
                    Total del servicio e importación
                  </p>
                  <p className="mt-2 text-3xl font-bold text-[#10104e]">
                    {usd(result.calculation.totalServiceUsd)}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    No incluye la compra de mercadería (
                    {usd(result.calculation.merchandiseUsd)}). Peso facturable:{" "}
                    {result.calculation.chargeableKg} kg.
                  </p>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Vigencia hasta{" "}
                  {new Date(result.calculation.expiresAt).toLocaleString(
                    "es-AR",
                  )}
                  .
                </p>
              </>
            )}
            <details className="mt-6 text-sm text-slate-500">
              <summary className="cursor-pointer">
                Detalle de la solicitud
              </summary>
              <p className="mt-3 break-all">Referencia: {result.requestId}</p>
              <p>
                Registrada: {new Date(result.createdAt).toLocaleString("es-AR")}
              </p>
            </details>
          </div>
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 text-sm text-slate-500">
          <p>GlobalTrip · Comercio exterior y logística</p>
          <a
            href="https://globaltriplog.com"
            className="font-medium hover:underline"
          >
            Volver a GlobalTrip ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
