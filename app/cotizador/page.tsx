// app/cotizador/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Product = { descripcion: string; link: string };
type Bulto = { cantidad: number; ancho: number; alto: number; largo: number; pesoKg: number };

// helpers
function num(v: unknown, def = 0): number {
  const n =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : def;
  return Number.isFinite(n) ? n : def;
}
function str(n: number): string {
  return Number.isFinite(n) ? String(n) : "";
}
const round2 = (n: number) => Math.round(n * 100) / 100;

export default function CotizadorPage() {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // modales
  const [showModal, setShowModal] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    idx: number | null;
    type: "one" | "all" | null;
  }>({ open: false, idx: null, type: null });

  // contacto
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  // país
  const [origen, setOrigen] = useState<"China" | "Otro">("China");
  const [otroPais, setOtroPais] = useState("");
  const [destino] = useState("Argentina");

  // productos
  const [productos, setProductos] = useState<Product[]>([
    { descripcion: "", link: "" },
  ]);

  // bultos (con peso bruto por unidad)
  const [bultos, setBultos] = useState<Bulto[]>([
    { cantidad: 0, ancho: 0, alto: 0, largo: 0, pesoKg: 0 },
  ]);

  // >>> NUEVO: Valor de la mercadería (USD)
  const [valorMercaderia, setValorMercaderia] = useState<string>("");

  // >>> NUEVO: faltantes
  const [missingList, setMissingList] = useState<string[]>([]);

  // totales (derivados)
  const { brutoTotal, volumetricoTotal, aplicableTotal } = useMemo(() => {
    const divisor = 5000; // cm -> kg
    let bruto = 0;
    let vol = 0;
    for (const b of bultos) {
      const cant = Math.max(0, num(b.cantidad, 0));
      const unitVol = (num(b.ancho) * num(b.alto) * num(b.largo)) / divisor;
      vol += cant * (Number.isFinite(unitVol) ? unitVol : 0);
      bruto += cant * num(b.pesoKg, 0);
    }
    bruto = round2(bruto);
    vol = round2(vol);
    const aplicable = round2(Math.max(bruto, vol));
    return { brutoTotal: bruto, volumetricoTotal: vol, aplicableTotal: aplicable };
  }, [bultos]);

  // validación estricta
  const canSubmit = useMemo(() => {
    const contactoOk =
      nombre.trim().length > 0 &&
      email.trim().length > 0 &&
      telefono.trim().length > 0;

    const origenOk =
      origen === "China" || (origen === "Otro" && otroPais.trim().length > 0);

    const productosOk =
      productos.length > 0 &&
      productos.every((p) => p.descripcion.trim().length > 0 && p.link.trim().length > 0);

    const bultosOk =
      bultos.length > 0 &&
      bultos.every(
        (b) =>
          Number(b.cantidad) > 0 &&
          Number(b.ancho) > 0 &&
          Number(b.alto) > 0 &&
          Number(b.largo) > 0 &&
          Number(b.pesoKg) > 0
      );

    const pesosOk = brutoTotal > 0 && aplicableTotal > 0;

    const valorOk = Number(valorMercaderia) > 0;

    return contactoOk && origenOk && productosOk && bultosOk && pesosOk && valorOk;
  }, [nombre, email, telefono, origen, otroPais, productos, bultos, brutoTotal, aplicableTotal, valorMercaderia]);

  // helpers productos
  function addProducto() {
    setProductos((p) => [...p, { descripcion: "", link: "" }]);
  }
  function askRemoveProducto(idx: number) {
    setConfirm({ open: true, idx, type: "one" });
  }
  function askRemoveTodos() {
    setConfirm({ open: true, idx: null, type: "all" });
  }
  function doConfirmedRemove() {
    if (confirm.type === "one" && confirm.idx !== null) {
      setProductos((p) => p.filter((_, i) => i !== confirm.idx));
    } else if (confirm.type === "all") {
      setProductos([{ descripcion: "", link: "" }]);
    }
    setConfirm({ open: false, idx: null, type: null });
  }

  // helpers bultos
  function addBulto() {
    setBultos((b) => [...b, { cantidad: 0, ancho: 0, alto: 0, largo: 0, pesoKg: 0 }]);
  }
  function removeBulto(i: number) {
    setBultos((b) => b.filter((_, idx) => idx !== i));
  }
  function vaciarBultos() {
    setBultos([{ cantidad: 0, ancho: 0, alto: 0, largo: 0, pesoKg: 0 }]);
  }

  function resetForm() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setOrigen("China");
    setOtroPais("");
    setProductos([{ descripcion: "", link: "" }]);
    setBultos([{ cantidad: 0, ancho: 0, alto: 0, largo: 0, pesoKg: 0 }]);
    setValorMercaderia("");
  }

  // >>> NUEVO: focus al primer faltante + listado
  function scrollAndFocus(id?: string) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).focus?.();
    }
  }
  function getMissing(): { items: string[]; firstId?: string } {
    const items: string[] = [];
    let firstId: string | undefined;
    const mark = (id: string, label: string) => {
      items.push(label);
      if (!firstId) firstId = id;
    };

    // Contacto
    if (!nombre.trim())   mark("input-nombre",  "Nombre");
    if (!email.trim())    mark("input-email",   "Correo electrónico");
    if (!telefono.trim()) mark("input-telefono","Teléfono");

    // País
    if (origen === "Otro" && !otroPais.trim()) mark("input-otro-pais", "País de origen");

    // Productos
    productos.forEach((p, i) => {
      const n = i + 1;
      if (!p.descripcion.trim()) mark(`prod-desc-${i}`, `Producto ${n}: descripción`);
      if (!p.link.trim())        mark(`prod-link-${i}`, `Producto ${n}: link`);
    });

    // Bultos
    bultos.forEach((b, i) => {
      const n = i + 1;
      if (!(Number(b.cantidad) > 0)) mark(`b${i}-cant`,  `Bulto ${n}: cantidad`);
      if (!(Number(b.ancho) > 0))    mark(`b${i}-ancho`, `Bulto ${n}: ancho`);
      if (!(Number(b.alto) > 0))     mark(`b${i}-alto`,  `Bulto ${n}: alto`);
      if (!(Number(b.largo) > 0))    mark(`b${i}-largo`, `Bulto ${n}: largo`);
      if (!(Number(b.pesoKg) > 0))   mark(`b${i}-peso`,  `Bulto ${n}: peso bruto por unidad`);
    });

    // Pesos totales
    if (!(brutoTotal > 0))      mark("totales", "Peso bruto total");
    if (!(aplicableTotal > 0))  mark("totales", "Peso aplicable");

    // >>> NUEVO: valor mercadería
    if (!(Number(valorMercaderia) > 0)) mark("input-valor-mercaderia", "Valor de la mercadería (USD)");

    return { items, firstId };
  }

  // submit
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNotice(null);
    setMissingList([]);

    // Botón SIEMPRE activo: si falta algo, mostramos faltantes y enfocamos
    if (!canSubmit) {
      const { items, firstId } = getMissing();
      setMissingList(items);
      scrollAndFocus(firstId);
      return;
    }

    setLoading(true);

    const payload = {
      timestamp: new Date().toISOString(),
      origen: "nextjs-courier-quote",
      contacto: { nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim() },
      pais_origen: origen === "Otro" ? otroPais.trim() : origen,
      pais_destino: destino,
      productos: productos.map((p, i) => ({
        descripcion: p.descripcion.trim().replace(/^Producto \d+:\s*/, "") || `Producto ${i + 1}`,
        link: p.link.trim(),
      })),
      bultos,
      totales: {
        peso_bruto_kg: brutoTotal,
        peso_volumetrico_kg: volumetricoTotal,
        peso_aplicable_kg: aplicableTotal,
      },
      // >>> NUEVO: enviar valor declarado
      valor_mercaderia_usd: Number(valorMercaderia),
    };

    try {
      const webhook = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (!webhook) throw new Error("Falta NEXT_PUBLIC_N8N_WEBHOOK_URL");

      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        resetForm();
        setShowModal(true);
      } else {
        setNotice("No pudimos enviar la cotización.");
      }
    } catch (err: any) {
      setNotice(err?.message || "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
        <Image src="/logo.png" alt="GlobalTrip Logo" width={140} height={52} priority unoptimized />
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-brand-dark">Cotizador Global Trip</h1>
          <p className="mt-2 text-sm sm:text-base text-brand-medium">Completá los datos y te enviamos la cotización por mail.</p>
        </div>
      </div>

      {/* Aviso courier */}
      <section className="rounded-2xl border border-brand-border/90 bg-brand-light p-4 text-brand-dark shadow-sm">
        <p className="font-semibold">Recordá las reglas del courier:</p>
        <p className="mt-1 text-sm sm:text-base italic text-brand-medium">
          El valor total de la compra no puede superar los{" "}
          <span className="font-bold">3000 dólares</span> y el{" "}
          <span className="font-bold">peso de cada bulto</span> no puede superar
          los <span className="font-bold">50 kilogramos brutos</span>.
        </p>
      </section>

      {notice && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{notice}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-8 sm:space-y-10 text-brand-dark">
        {/* Contacto */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">Datos de contacto</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <input id="input-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo*" className="h-11 rounded-xl border border-brand-border/80 px-3" />
            <input id="input-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico*" className="h-11 rounded-xl border border-brand-border/80 px-3" />
            <input id="input-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono*" className="h-11 rounded-xl border border-brand-border/80 px-3" />
          </div>
        </section>

        {/* País de origen */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">País de origen de los productos a cotizar</h2>
          <p className="mt-2 text-sm text-brand-medium">Seleccioná el país de origen:</p>
          <div className="mt-3 flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="origen" checked={origen === "China"} onChange={() => setOrigen("China")} className="h-4 w-4 accent-brand-dark" /> China
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="origen" checked={origen === "Otro"} onChange={() => setOrigen("Otro")} className="h-4 w-4 accent-brand-dark" /> Otro
            </label>
          </div>
          {origen === "Otro" && (
            <input id="input-otro-pais" required value={otroPais} onChange={(e) => setOtroPais(e.target.value)} placeholder="Especificá el país" className="mt-3 h-11 w-full rounded-xl border border-brand-border/80 px-3" />
          )}
        </section>

        {/* Productos */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">Productos</h2>
          <p className="mt-1 text-xs text-brand-medium">
            Cargá descripción y link del/los producto(s). Podés agregar varios.
          </p>

          <div className="mt-4 space-y-6">
            {productos.map((p, idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-sm font-medium text-brand-dark">Producto {idx + 1}</div>

                {/* 2 columnas: izquierda descripción / derecha link */}
                <div className="grid gap-3 sm:grid-cols-[1fr_320px]">
                  {/* Descripción */}
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Descripción*</label>
                    <textarea
                      id={`prod-desc-${idx}`}
                      required
                      rows={3}
                      value={p.descripcion}
                      onChange={(e) =>
                        setProductos((list) => {
                          const copy = [...list];
                          copy[idx] = { ...copy[idx], descripcion: e.target.value };
                          return copy;
                        })
                      }
                      placeholder='Ej: "Reloj inteligente con Bluetooth"'
                      className="rounded-xl border border-brand-border/80 px-3 py-2"
                    />
                  </div>

                  {/* Link obligatorio (textarea para mantener altura) */}
                  <div className="grid gap-1.5 min-w-0">
                    <label className="text-xs font-medium text-brand-medium">Link*</label>
                    <textarea
                      id={`prod-link-${idx}`}
                      required
                      rows={3}
                      value={p.link}
                      onChange={(e) =>
                        setProductos((list) => {
                          const copy = [...list];
                          copy[idx] = { ...copy[idx], link: e.target.value };
                          return copy;
                        })
                      }
                      placeholder="Pegá el link del producto (de cualquier tienda). Lo usamos para identificar exactamente lo que querés cotizar."
                      className="rounded-xl border border-brand-border/80 px-3 py-2"
                    />
                  </div>
                </div>

                {/* Botón eliminar */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => askRemoveProducto(idx)}
                    disabled={productos.length === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-4 text-sm font-medium text-brand-dark shadow-sm transition disabled:opacity-50"
                  >
                    🗑️ Eliminar
                  </button>
                </div>

                <hr className="mt-4 border-brand-border/80" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={addProducto}
              className="inline-flex h-10 w-full sm:w-auto flex-1 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-4 text-sm font-semibold text-brand-dark shadow-sm hover:bg-white"
            >
              ➕ Agregar producto
            </button>
            <button
              type="button"
              onClick={askRemoveTodos}
              className="inline-flex h-10 w-full sm:w-auto flex-1 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-4 text-sm font-semibold text-brand-dark shadow-sm hover:bg-white"
            >
              🗑️ Eliminar todos
            </button>
          </div>
        </section>

        {/* Bultos (dimensiones) */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <h3 className="text-base font-semibold text-brand-dark">Bultos</h3>
          <p className="mt-1 text-xs text-brand-medium">
            Cargá por bulto <b>cantidad</b>, <b>dimensiones</b> en <b>cm</b> y <b>peso bruto por unidad (kg)</b>. Calculamos el <i>peso volumétrico</i> y los totales.
          </p>

          <div className="mt-4 space-y-6">
            {bultos.map((b, i) => (
              <div key={i} className="space-y-2">
                <div className="text-sm font-medium text-brand-dark">Bulto {i + 1}</div>

                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Cantidad</label>
                    <input
                      id={`b${i}-cant`}
                      type="number"
                      min={0}
                      step={1}
                      value={str(b.cantidad)}
                      onChange={(e) =>
                        setBultos((list) => {
                          const copy = [...list];
                          copy[i] = { ...copy[i], cantidad: num(e.target.value, 0) };
                          return copy;
                        })
                      }
                      className="h-11 rounded-xl border border-brand-border/80 px-3"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Ancho (cm)</label>
                    <input
                      id={`b${i}-ancho`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={str(b.ancho)}
                      onChange={(e) =>
                        setBultos((list) => {
                          const copy = [...list];
                          copy[i] = { ...copy[i], ancho: num(e.target.value, 0) };
                          return copy;
                        })
                      }
                      className="h-11 rounded-xl border border-brand-border/80 px-3"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Alto (cm)</label>
                    <input
                      id={`b${i}-alto`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={str(b.alto)}
                      onChange={(e) =>
                        setBultos((list) => {
                          const copy = [...list];
                          copy[i] = { ...copy[i], alto: num(e.target.value, 0) };
                          return copy;
                        })
                      }
                      className="h-11 rounded-xl border border-brand-border/80 px-3"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Largo (cm)</label>
                    <input
                      id={`b${i}-largo`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={str(b.largo)}
                      onChange={(e) =>
                        setBultos((list) => {
                          const copy = [...list];
                          copy[i] = { ...copy[i], largo: num(e.target.value, 0) };
                          return copy;
                        })
                      }
                      className="h-11 rounded-xl border border-brand-border/80 px-3"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Peso bruto por unidad (kg)</label>
                    <input
                      id={`b${i}-peso`}
                      type="number"
                      min={0}
                      step={0.01}
                      value={str(b.pesoKg)}
                      onChange={(e) =>
                        setBultos((list) => {
                          const copy = [...list];
                          copy[i] = { ...copy[i], pesoKg: num(e.target.value, 0) };
                          return copy;
                        })
                      }
                      className="h-11 rounded-xl border border-brand-border/80 px-3"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => removeBulto(i)}
                    disabled={bultos.length === 1}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-4 text-sm font-medium text-brand-dark shadow-sm transition disabled:opacity-50"
                  >
                    🗑️ Eliminar bulto
                  </button>
                </div>

                <hr className="mt-4 border-brand-border/80" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={addBulto}
              className="inline-flex h-10 w-full sm:w-auto flex-1 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-4 text-sm font-semibold text-brand-dark shadow-sm hover:bg-white"
            >
              ➕ Agregar bulto
            </button>
            <button
              type="button"
              onClick={vaciarBultos}
              className="inline-flex h-10 w-full sm:w-auto flex-1 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-4 text-sm font-semibold text-brand-dark shadow-sm hover:bg-white"
            >
              🧹 Vaciar bultos
            </button>
          </div>
        </section>

        {/* Totales calculados */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80" id="totales">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-brand-dark">Peso total de los bultos</h2>
            <span className="text-brand-medium text-sm">🔗</span>
          </div>

          <div className="mt-4 grid items-start gap-4 sm:grid-cols-3">
            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-brand-dark">Peso bruto total (kg)</span>
              </div>
              <div className="h-11 px-4 inline-flex items-center rounded-xl border border-brand-border/80 bg-white font-semibold text-brand-dark">
                {brutoTotal.toFixed(2)}
              </div>
            </div>

            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-brand-dark">Peso volumétrico total (kg)</span>
              </div>
              <div className="h-11 px-4 inline-flex items-center rounded-xl border border-brand-border/80 bg-white font-semibold text-brand-dark">
                {volumetricoTotal.toFixed(2)}
              </div>
            </div>

            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-brand-dark">Peso aplicable (kg)</span>
                <span className="text-brand-medium">🔒</span>
              </div>
              <div className="h-11 px-4 inline-flex items-center rounded-xl border border-brand-border/80 bg-white font-semibold text-brand-dark">
                {aplicableTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm text-brand-medium">
            Se toma el mayor entre peso volumétrico ({volumetricoTotal.toFixed(2)}) y peso bruto ({brutoTotal.toFixed(2)}).
          </p>
        </section>

        {/* >>> NUEVO: Valor de la mercadería (USD) */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <label htmlFor="input-valor-mercaderia" className="text-sm font-medium text-brand-dark">
            Valor de la mercadería (USD)*
          </label>
          <input
            id="input-valor-mercaderia"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            required
            value={valorMercaderia}
            onChange={(e) => setValorMercaderia(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-brand-border/80 px-3"
            placeholder="Ej: 350.00"
          />
          <p className="text-xs text-brand-dark/60 mt-1">
            Indicá el valor total declarado de los productos en USD.
          </p>
        </section>

        {/* CTA */}
        <div className="sticky bottom-4 z-10 mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white/90 p-4 shadow-md ring-1 ring-brand-border/80 backdrop-blur">
            <div className="flex justify-center">
              <button
                disabled={loading} // << siempre activo salvo loading
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-6 font-semibold text-brand-dark transition disabled:opacity-50 hover:bg-white"
              >
                {loading ? "Enviando..." : "📩 Solicitar cotización"}
              </button>
            </div>

            {missingList.length > 0 && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <b>Te falta completar:</b>
                <ul className="mt-1 list-disc ps-5">
                  {missingList.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Modal éxito */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
            <button onClick={() => setShowModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600" aria-label="Cerrar">
              ✕
            </button>
            <h2 className="text-xl font-bold text-brand-dark">¡Listo!</h2>
            <p className="mt-3 text-brand-dark">Recibimos tu solicitud. En breve te llegará la cotización.</p>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-brand-dark text-white text-sm font-medium">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
