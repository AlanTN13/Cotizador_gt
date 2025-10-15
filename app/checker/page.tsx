// app/cotizador/page.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Product = { descripcion: string; link: string };
type Bulto = { cantidad: number; ancho: number; alto: number; largo: number };

// helpers
function num(v: unknown, def = 0): number {
  const n =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : def;
  return Number.isFinite(n) ? n : def;
}
function str(n: number): string {
  return Number.isFinite(n) ? String(n) : "";
}

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

  // bultos
  const [bultos, setBultos] = useState<Bulto[]>([
    { cantidad: 0, ancho: 0, alto: 0, largo: 0 },
  ]);

  // totales
  const [pesoBruto, setPesoBruto] = useState<number>(0);
  const [valorTotalUSD, setValorTotalUSD] = useState<number>(0);

  // cálculos
  const pesoVolumetrico = useMemo(() => {
    const divisor = 5000; // cm
    return bultos.reduce((acc, b) => {
      const volKg = (num(b.ancho) * num(b.alto) * num(b.largo)) / divisor;
      return acc + Math.max(0, num(b.cantidad)) * (Number.isFinite(volKg) ? volKg : 0);
    }, 0);
  }, [bultos]);

  const pesoAplicable = useMemo(
    () => Math.max(num(pesoBruto), num(pesoVolumetrico)),
    [pesoBruto, pesoVolumetrico]
  );

  // validación estricta: TODO completo
  const canSubmit = useMemo(() => {
    const contactoOk =
      nombre.trim().length > 0 &&
      email.trim().length > 0 &&
      telefono.trim().length > 0;

    const origenOk =
      origen === "China" || (origen === "Otro" && otroPais.trim().length > 0);

    const productosOk =
      productos.length > 0 &&
      productos.every((p) => p.descripcion.trim().length > 0);

    const bultosOk =
      bultos.length > 0 &&
      bultos.every(
        (b) =>
          Number(b.cantidad) > 0 &&
          Number(b.ancho) > 0 &&
          Number(b.alto) > 0 &&
          Number(b.largo) > 0
      );

    const pesosOk = Number(pesoBruto) > 0 && Number(pesoAplicable) > 0;
    const valorOk = Number(valorTotalUSD) > 0;

    return contactoOk && origenOk && productosOk && bultosOk && pesosOk && valorOk;
  }, [
    nombre,
    email,
    telefono,
    origen,
    otroPais,
    productos,
    bultos,
    pesoBruto,
    pesoAplicable,
    valorTotalUSD,
  ]);

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
    setBultos((b) => [...b, { cantidad: 0, ancho: 0, alto: 0, largo: 0 }]);
  }
  function removeBulto(i: number) {
    setBultos((b) => b.filter((_, idx) => idx !== i));
  }
  function vaciarBultos() {
    setBultos([{ cantidad: 0, ancho: 0, alto: 0, largo: 0 }]);
  }

  function resetForm() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setOrigen("China");
    setOtroPais("");
    setProductos([{ descripcion: "", link: "" }]);
    setBultos([{ cantidad: 0, ancho: 0, alto: 0, largo: 0 }]);
    setPesoBruto(0);
    setValorTotalUSD(0);
  }

  // submit
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setNotice(null);

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
        peso_bruto_kg: +num(pesoBruto).toFixed(2),
        peso_volumetrico_kg: +num(pesoVolumetrico).toFixed(2),
        peso_aplicable_kg: +num(pesoAplicable).toFixed(2),
        valor_total_usd: +num(valorTotalUSD).toFixed(2),
      },
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
          <h1 className="text-xl sm:text-3xl font-extrabold text-brand-dark">Cotizador GlobalTrip</h1>
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
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo*" className="h-11 rounded-xl border border-brand-border/80 px-3" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico*" className="h-11 rounded-xl border border-brand-border/80 px-3" />
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono*" className="h-11 rounded-xl border border-brand-border/80 px-3" />
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
            <input required value={otroPais} onChange={(e) => setOtroPais(e.target.value)} placeholder="Especificá el país" className="mt-3 h-11 w-full rounded-xl border border-brand-border/80 px-3" />
          )}
        </section>

        {/* Productos */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">Productos</h2>
          <p className="mt-1 text-xs text-brand-medium">Cargá descripción y link del/los producto(s). Podés agregar varios.</p>

          <div className="mt-4 space-y-6">
            {productos.map((p, idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-sm font-medium text-brand-dark">Producto {idx + 1}</div>

                <div className="grid gap-3 sm:grid-cols-[1fr_320px]">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Descripción*</label>
                    <textarea
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

                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Link (opcional)</label>
                    <input
                      type="url"
                      value={p.link}
                      onChange={(e) =>
                        setProductos((list) => {
                          const copy = [...list];
                          copy[idx] = { ...copy[idx], link: e.target.value };
                          return copy;
                        })
                      }
                      placeholder="https://..."
                      className="h-11 rounded-xl border border-brand-border/80 px-3"
                    />
                  </div>
                </div>

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
            Cargá por bulto <b>cantidad</b> y <b>dimensiones</b> en <b>cm</b>. Calculamos el <i>peso volumétrico</i>.
          </p>

          <div className="mt-4 space-y-6">
            {bultos.map((b, i) => (
              <div key={i} className="space-y-2">
                <div className="text-sm font-medium text-brand-dark">Bulto {i + 1}</div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium text-brand-medium">Cantidad</label>
                    <input
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

        {/* Peso total de los bultos (estilo screenshot) */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-brand-dark">Peso total de los bultos</h2>
            <span className="text-brand-medium text-sm">🔗</span>
          </div>

          <div className="mt-4 grid items-start gap-4 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-brand-dark">Peso bruto total (kg)</label>
              <input
                inputMode="decimal"
                type="number"
                min={0}
                step={0.01}
                value={str(pesoBruto)}
                onChange={(e) => setPesoBruto(num(e.target.value, 0))}
                placeholder="0.00"
                className="h-11 rounded-xl border border-brand-border/80 px-3"
              />
            </div>

            <div className="grid gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-brand-dark">Peso aplicable (kg)</span>
                <span className="text-brand-medium">🔒</span>
              </div>
              <div className="h-11 px-4 inline-flex items-center rounded-xl border border-brand-border/80 bg-white font-semibold text-brand-dark">
                {num(pesoAplicable).toFixed(2)}
              </div>
            </div>
          </div>

          <p className="mt-2 text-sm text-brand-medium">
            Se toma el mayor entre peso volumétrico ({num(pesoVolumetrico).toFixed(2)}) y peso bruto ({num(pesoBruto).toFixed(2)}).
          </p>
        </section>

        {/* Valor total */}
        <section className="rounded-2xl bg-white p-4 sm:p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">Valor total del pedido</h2>
          <div className="mt-3 grid gap-1.5">
            <label className="text-xs font-medium text-brand-medium">Valor total (USD)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={str(valorTotalUSD)}
              onChange={(e) => setValorTotalUSD(num(e.target.value, 0))}
              className="h-11 rounded-xl border border-brand-border/80 px-3"
            />
          </div>
        </section>

        {/* CTA */}
        <div className="sticky bottom-4 z-10 mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white/90 p-4 shadow-md ring-1 ring-brand-border/80 backdrop-blur">
            <div className="flex justify-center">
              <button
                disabled={loading || !canSubmit}
                className="w-full sm:w-auto inline-flex h-11 items-center justify-center rounded-xl border border-brand-border/90 bg-brand-light px-6 font-semibold text-brand-dark transition disabled:opacity-50 hover:bg-white"
              >
                {loading ? "Enviando..." : "📩 Solicitar cotización"}
              </button>
            </div>
            {!canSubmit && (
              <p className="mt-2 text-center text-xs text-brand-medium">Completá todos los campos para continuar.</p>
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

      {/* Modal confirmación (eliminar producto) */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
            <button
              onClick={() => setConfirm({ open: false, idx: null, type: null })}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold text-brand-dark">
              {confirm.type === "all" ? "¿Eliminar todos los productos?" : `¿Eliminar producto ${((confirm.idx ?? 0) as number) + 1}?`}
            </h2>
            <p className="mt-2 text-sm text-brand-medium">
              Recordá que esta acción es permanente y no podrás recuperar la información de este producto.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirm({ open: false, idx: null, type: null })}
                className="px-4 py-2 rounded-lg border border-brand-border bg-white text-sm font-medium text-brand-dark"
              >
                Cancelar
              </button>
              <button onClick={doConfirmedRemove} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
