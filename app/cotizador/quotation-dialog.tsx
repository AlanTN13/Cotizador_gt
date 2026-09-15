"use client";
import { useEffect, useRef } from "react";
import type { CourierResponse } from "@/lib/courier/n8n-contract";
import QuotationLoading from "./quotation-loading";
import styles from "./quotation-loading.module.css";
const usd = (value: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export function QuotationNotice() {
  return <div className={styles.notice}>
    <h3>Una estimación para orientarte</h3>
    <p>Este cálculo busca darte una referencia rápida de cuánto podría costar tu importación. Las tarifas, impuestos y condiciones pueden variar cuando GlobalTrip revise la operación definitiva.</p>
    <div className={styles.paymentNotice}>
      <h3>Antes de pagar a tu proveedor</h3>
      <p>Esperá siempre la confirmación de GlobalTrip. No realices pagos al exterior hasta recibir nuestro OK.</p>
    </div>
    <p className={styles.disclaimer}>Esta simulación es orientativa y no constituye un presupuesto formal.</p>
  </div>;
}

export default function QuotationDialog({ open, busy, result, error, fob, onReset, onDismiss }: {
  open: boolean; busy: boolean; result: CourierResponse | null; error: string; fob: number;
  onReset: () => void; onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, [open]);
  useEffect(() => {
    if (open && !busy) {
      dialog.current?.scrollTo({ top: 0 });
      heading.current?.focus({ preventScroll: true });
    }
  }, [open, busy, result, error]);
  const success = result?.status === "cotizado";
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={busy ? "quotation-loading-title" : "quotation-result-title"}
    onCancel={event => { event.preventDefault(); if (!busy) onDismiss(); }}>
    {open && (busy ? <QuotationLoading /> : <div key={success ? "result" : "error"} className={`${styles.result} ${styles.reveal}`}>
      <h2 ref={heading} tabIndex={-1} id="quotation-result-title" className={styles.resultTitle}>{success ? "Tu estimación está lista" : "No pudimos completar tu estimación"}</h2>
      {success ? <>
        <div className={styles.resultColumns}><div>
        <div className={styles.totalBox}>
          <p className={styles.totalLabel}>Costo aproximado de importación</p>
          <p className={styles.total}>{usd(result.total_usd)}</p>
          <p className={styles.explanation}>Este total corresponde a los costos estimados de logística e importación. No incluye los {usd(fob)} de mercadería que pagás al proveedor.</p>
        </div>
        <dl className={styles.breakdown}>
          <div><dt>Flete internacional</dt><dd>{usd(result.flete_internacional_usd)}</dd></div>
          <div><dt>Handling con IVA</dt><dd>{usd(result.handling_con_iva_usd)}</dd></div>
          <div><dt>Impuestos y tasas estimados</dt><dd>{usd(result.impuestos_y_tasas_usd)}</dd></div>
          <div><dt>Peso considerado</dt><dd>{result.peso_considerado_kg} kg</dd></div>
        </dl>
        </div><QuotationNotice /></div>
        <button type="button" className={styles.primaryAction} onClick={onReset}>Hacer otra estimación</button>
      </> : <>
        <p role="alert" className={styles.errorMessage}>{error || result?.mensaje}</p>
        <button type="button" className={styles.primaryAction} onClick={onDismiss}>Volver al formulario</button>
      </>}
    </div>)}
  </dialog>;
}
