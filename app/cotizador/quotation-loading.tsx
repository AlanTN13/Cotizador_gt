"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./quotation-loading.module.css";

const messages = [
  "Analizando tu producto",
  "Revisando clasificación arancelaria",
  "Estimando derechos e impuestos",
  "Calculando peso y flete",
  "Armando tu cotización",
];
const route = ["China", "Clasificación", "Transporte aéreo", "Aduana", "Buenos Aires"];
const iconPaths = [
  "M3 21V10l6 3V7l6 3V3h4v18H3Zm4-4h1m3 0h1m4 0h1",
  "M6 3h9l4 4v14H6V3Zm8 0v5h5M9 12h7m-7 4h5",
  "m3 11 7 2 4 8 2-1-1-8 6-6c2-2 0-4-2-2l-6 6-8-1-2 2Z",
  "m3 9 9-6 9 6H3Zm2 1v10m5-10v10m4-10v10m5-10v10M3 21h18",
  "M3 21V9h7v12m0-16h8v16m0-10h3v10M6 12v2m0 3v1m7-10v2m2-2v2m-2 3v2m2-2v2M2 21h20",
];

export default function QuotationLoading() {
  const [messageIndex, setMessageIndex] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.current?.scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth", block: "start" });
    panel.current?.focus({ preventScroll: true });
    // Ambient messages only: elapsed time never marks a workflow stage complete.
    const timer = window.setInterval(() => setMessageIndex(i => (i + 1) % messages.length), 10000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div ref={panel} tabIndex={-1} className={`${styles.panel} ${styles.reveal}`} role="status" aria-labelledby="quotation-loading-title" aria-describedby="quotation-loading-description">
      <div className={styles.illustration} aria-hidden="true">
        <span className={styles.origin}>CN</span>
        <span className={styles.flightLine} />
        <span className={styles.plane}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"><path d={iconPaths[2]} /></svg>
        </span>
        <span className={styles.destination}>BUE</span>
      </div>
      <h2 id="quotation-loading-title" className={styles.title}>Estamos preparando tu estimación</h2>
      <p id="quotation-loading-description" className={styles.description}>Este proceso puede demorar aproximadamente 1 minuto. Estamos analizando tus productos y calculando los costos de importación. No cierres esta ventana.</p>
      <ol className={styles.route} aria-label="China → Clasificación → Transporte aéreo → Aduana → Buenos Aires">
        {route.map((label, index) => <li key={label} className={styles.stop}>
          <span className={styles.routeIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[index]} /></svg></span>
          <span>{label}</span>
          {index < route.length - 1 && <span className={styles.arrow} aria-hidden="true">→</span>}
        </li>)}
      </ol>
      <div className={styles.message} aria-hidden="true">
        <span className={styles.pulse} />
        <span key={messageIndex} className={styles.messageText}>{messages[messageIndex]}</span>
      </div>
      <p className={styles.caption}>Recorrido ilustrativo. El resultado aparecerá cuando esté listo.</p>
    </div>
  );
}
