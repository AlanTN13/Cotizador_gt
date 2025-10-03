"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Product = { descripcion: string; link: string };

export default function CheckerPage() {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  // Modal éxito
  const [showModal, setShowModal] = useState(false);

  // Modal confirmación (eliminar uno / todos)
  const [confirm, setConfirm] = useState<{ open: boolean; idx: number | null; type: "one" | "all" | null }>({
    open: false,
    idx: null,
    type: null,
  });
  // Datos
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [origen, setOrigen] = useState<"China" | "Otro">("China");
  const [otroPais, setOtroPais] = useState("");
  const [destino] = useState("Argentina");

  // Productos
  const [productos, setProductos] = useState<Product[]>([{ descripcion: "", link: "" }]);

  const canSubmit = useMemo(
    () => productos.some((p) => p.descripcion.trim().length > 0),
    [productos]
  );

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

  function resetForm() {
    setNombre("");
    setEmail("");
    setTelefono("");
    setOrigen("China");
    setOtroPais("");
    setProductos([{ descripcion: "", link: "" }]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setNotice(null);
    setOk(null);

    const descripciones = productos
      .map((p, i) => {
        const t = p.descripcion.trim();
        return t ? `Producto ${i + 1}: ${t}` : "";
      })
      .filter(Boolean)
      .join("\n");

    const links = productos
      .map((p) => p.link.trim())
      .filter(Boolean)
      .join(", ");

      const origenFinal = origen === "Otro" && otroPais.trim() ? otroPais.trim() : origen;

      const productosLimpios = productos
        .map((p) => ({
          descripcion: p.descripcion.trim(),
          link: p.link.trim(),
        }))
        .filter((p) => p.descripcion.length > 0);
      
        const payload = {
            timestamp: new Date().toISOString(),
            origen: "nextjs-courier-checker",
            contacto: {
              nombre: nombre.trim(),
              email: email.trim(),
              telefono: telefono.trim(),
            },
            pais_origen: origenFinal,
            productos: productos.map((p) => ({
              descripcion: p.descripcion.trim(),
              link: p.link.trim(),
            })),
          };
          
      // --- enviar al webhook de n8n ---
      try {
        const webhook = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
        if (!webhook) throw new Error("Falta NEXT_PUBLIC_N8N_WEBHOOK_URL");
      
        const res = await fetch(webhook as string, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      
        let j: any = null;
        try {
          j = await res.json();
        } catch {
          j = { ok: res.ok };
        }
      

      const okResp = j?.ok ?? res.ok ?? true;
      setOk(okResp);

      if (okResp) {
        resetForm();
        setShowModal(true);
      } else {
        setNotice(j?.error || "No pudimos enviar el formulario.");
      }
    } catch (err: any) {
      setOk(false);
      setNotice(err?.message || "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-5 rounded-2xl bg-white p-6 shadow-md ring-1 ring-brand-border/80">
        <Image src="/logo.png" alt="GlobalTrip Logo" width={160} height={60} priority unoptimized />
        <div>
          <h1 className="text-3xl font-extrabold text-brand-dark">Chequeá tu importación antes de comprar</h1>
          <p className="mt-2 text-base text-brand-medium">
            ⚡ Ingresá la info del producto y validá si cumple con las reglas de courier.
          </p>
        </div>
      </div>

      {/* Aviso courier */}
      <div className="rounded-2xl border border-brand-border/90 bg-brand-light p-4 text-brand-dark shadow-sm">
        <p className="font-semibold">Recordá las reglas del courier:</p>
        <p className="mt-1 italic text-brand-medium">
          El valor total de la compra no puede superar los <span className="font-bold">3000 dólares</span> y el{" "}
          <span className="font-bold">peso de cada bulto</span> no puede superar los{" "}
          <span className="font-bold">50 kilogramos brutos</span>.
        </p>
      </div>

      {/* Banner de error */}
      {notice && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {notice}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={onSubmit} className="space-y-10 text-brand-dark">
        {/* Datos de contacto */}
        <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">Datos de contacto</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo*"
              className="h-11 rounded-xl border border-brand-border/80 px-3"
            />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico*"
              className="h-11 rounded-xl border border-brand-border/80 px-3"
            />
            <input
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Teléfono*"
              className="h-11 rounded-xl border border-brand-border/80 px-3"
            />
          </div>
        </section>

        {/* País de origen */}
        <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">País de origen de los productos a validar</h2>
          <p className="mt-2 text-sm text-brand-medium">Seleccioná el país de origen:</p>
          <div className="mt-3 flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="origen"
                value="China"
                checked={origen === "China"}
                onChange={() => setOrigen("China")}
                className="h-4 w-4 accent-brand-dark"
              />
              China
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="origen"
                value="Otro"
                checked={origen === "Otro"}
                onChange={() => setOrigen("Otro")}
                className="h-4 w-4 accent-brand-dark"
              />
              Otro
            </label>
          </div>

          {origen === "Otro" && (
            <input
              required
              type="text"
              value={otroPais}
              onChange={(e) => setOtroPais(e.target.value)}
              placeholder="Especificá el país"
              className="mt-3 h-11 w-full rounded-xl border border-brand-border/80 px-3"
            />
          )}
        </section>

        {/* Productos */}
        <section className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-brand-border/80">
          <h2 className="text-lg font-semibold">Productos</h2>
          <p className="mt-1 text-xs text-brand-medium">
            Cargá descripción y link del/los producto(s). Podés agregar varios.
          </p>

          <div className="mt-4 space-y-6">
            {productos.map((p, idx) => (
              <div key={idx} className="space-y-2">
                <div className="text-sm font-medium text-brand-dark">Producto {idx + 1}</div>

                <div className="grid gap-3 md:grid-cols-[1fr_320px]">
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
                      placeholder={`Ej: "Reloj inteligente con Bluetooth"`}
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
                    className="inline-flex h-10 items-center justify-center rounded-xl 
                               border border-brand-border/90 bg-brand-light px-4 text-sm font-medium 
                               text-brand-dark shadow-sm transition disabled:opacity-50"
                  >
                    🗑️ Eliminar
                  </button>
                </div>

                <hr className="mt-4 border-brand-border/80" />
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4">
            <button
              type="button"
              onClick={addProducto}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl 
                         border border-brand-border/90 bg-brand-light px-4 text-sm font-semibold text-brand-dark shadow-sm hover:bg-white"
            >
              ➕ Agregar producto
            </button>
            <button
              type="button"
              onClick={askRemoveTodos}
              className="inline-flex h-10 flex-1 items-center justify-center rounded-xl 
                         border border-brand-border/90 bg-brand-light px-4 text-sm font-semibold text-brand-dark shadow-sm hover:bg-white"
            >
              🗑️ Eliminar todos
            </button>
          </div>
        </section>

        {/* CTA sticky inferior */}
        <div className="sticky bottom-4 z-10 mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white/90 p-4 shadow-md ring-1 ring-brand-border/80 backdrop-blur">
            <div className="flex justify-center">
              <button
                disabled={loading || !canSubmit}
                className="inline-flex h-11 min-w-[240px] items-center justify-center rounded-xl 
                           border border-brand-border/90 bg-brand-light px-6 font-semibold text-brand-dark
                           transition disabled:opacity-50 hover:bg-white"
              >
                {loading ? "Enviando..." : "🔎 Validar productos"}
              </button>
            </div>
            {!canSubmit && (
              <p className="mt-2 text-center text-xs text-brand-medium">
                Agregá al menos la descripción de un producto para continuar.
              </p>
            )}
          </div>
        </div>
      </form>

      {/* Modal de éxito */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold text-brand-dark">¡Listo!</h2>
            <p className="mt-3 text-brand-dark">
              Recibimos tu solicitud. En breve te llegará el resultado a{" "}
              <a href={`mailto:${email}`} className="font-semibold underline">
                {email || "tu correo"}
              </a>
              .
            </p>
            <p className="mt-2 text-sm text-brand-medium">Podés cargar otro si querés.</p>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setProductos([{ descripcion: "", link: "" }]);
                }}
                className="px-4 py-2 rounded-lg bg-brand-light border border-brand-border text-brand-dark text-sm font-medium"
              >
                🔄 Validar otro producto
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-brand-dark text-white text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación (eliminar) */}
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
              {confirm.type === "all"
                ? "¿Eliminar todos los productos?"
                : `¿Eliminar producto ${((confirm.idx ?? 0) as number) + 1}?`}
            </h2>
            <p className="mt-2 text-sm text-brand-medium">
            Recorda que esta acción es permanente y no podrás recuperar la información de este producto.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirm({ open: false, idx: null, type: null })}
                className="px-4 py-2 rounded-lg border border-brand-border bg-white text-sm font-medium text-brand-dark"
              >
                Cancelar
              </button>
              <button
                onClick={doConfirmedRemove}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
