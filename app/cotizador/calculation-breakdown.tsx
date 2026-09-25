import type { CalculationDetail } from "@/lib/courier/n8n-contract";
import styles from "./quotation-loading.module.css";

function Rows({ rows }: { rows: CalculationDetail["resumen"] }) {
  return <div className={styles.auditTable} role="table">
    <div className={styles.auditHeader} role="row"><span>Concepto</span><span>Base / fórmula</span><span>Tasa</span><span>Importe</span></div>
    {rows.map((row, index) => <div className={styles.auditRow} role="row" key={`${row.concepto}-${index}`}>
      <strong>{row.concepto}</strong><span>{row.base_formula}</span><span>{row.tasa}</span><span>{row.importe}</span>
    </div>)}
  </div>;
}

export default function CalculationBreakdown({ detail }: { detail: CalculationDetail }) {
  return <section className={styles.audit} aria-labelledby="audit-title">
    <div className={styles.auditTitle}><p>Modo QA · período de pruebas</p><h3 id="audit-title">Desglose del cálculo</h3></div>
    <Rows rows={detail.resumen} />
    {detail.productos.map((product, index) => <section className={styles.auditProduct} key={`${product.producto}-${index}`}>
      <h4>Producto {index + 1}: {product.producto}</h4><p>NCM/SIM: <strong>{product.ncm_sim}</strong></p><Rows rows={product.lineas} />
    </section>)}
    <section className={styles.auditProduct}><h4>Totales</h4><Rows rows={detail.totales} /></section>
  </section>;
}
