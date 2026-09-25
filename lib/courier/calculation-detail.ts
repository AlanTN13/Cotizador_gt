import type { CalculationDetail, CourierRequest, CourierUpstreamResponse } from "./n8n-contract";

const number = (value: number, digits = 2) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: digits }).format(value);
const usd = (value: number) => `USD ${number(value)}`;
const kg = (value: number) => `${number(value)} kg`;
const pct = (value: number) => `${number(value * 100)}%`;

export function buildCalculationDetail(request: CourierRequest, response: Extract<CourierUpstreamResponse, { status: "cotizado" }>): CalculationDetail {
  const a = response.auditoria;
  const productByIndex = new Map(a.productos.map(product => [product.indice, product]));
  const taxByIndex = new Map(a.taxResolutions.map(tax => [tax.productIndex + 1, tax]));
  return {
    resumen: [
      { concepto: "FOB", base_formula: "Valor total declarado", tasa: "—", importe: usd(request.fob_usd) },
      { concepto: "Peso bruto", base_formula: "Suma de bultos", tasa: "—", importe: kg(a.peso_real_total_kg) },
      { concepto: "Peso volumétrico", base_formula: "Largo × ancho × alto ÷ 5.000", tasa: "—", importe: kg(a.peso_volumetrico_total_kg) },
      { concepto: "Peso bruto redondeado", base_formula: "Hacia arriba cada 0,5 kg", tasa: "—", importe: kg(a.peso_real_redondeado_kg) },
      { concepto: "Peso volumétrico redondeado", base_formula: "Hacia arriba cada 0,5 kg", tasa: "—", importe: kg(a.peso_volumetrico_redondeado_kg) },
      { concepto: "Peso aplicable", base_formula: "Máximo entre ambos pesos redondeados", tasa: "—", importe: kg(response.peso_considerado_kg) },
      { concepto: "Tarifa", base_formula: "Escala China 24 / 20 / 19", tasa: "—", importe: `${usd(a.tarifa_usd_kg)}/kg` },
      { concepto: "Flete internacional", base_formula: `${kg(response.peso_considerado_kg)} × ${usd(a.tarifa_usd_kg)}`, tasa: "—", importe: usd(response.flete_internacional_usd) },
      { concepto: "Flete a fines aduaneros", base_formula: `MAX(${kg(response.peso_considerado_kg)} × USD 2,10; USD 2,10)`, tasa: "—", importe: usd(a.flete_aduanero_usd) },
      { concepto: "Seguro a fines aduaneros", base_formula: "FOB + flete aduanero", tasa: "1%", importe: usd(a.seguro_aduanero_usd) },
      { concepto: "CIF", base_formula: "FOB + flete aduanero + seguro", tasa: "—", importe: usd(a.cif_usd) },
    ],
    productos: a.tributos_por_producto.map(item => {
      const tax = taxByIndex.get(item.indice)!;
      const product = productByIndex.get(item.indice)!;
      return { producto: product?.producto || tax.agentEvidence.producto, ncm_sim: tax.sim || tax.ncm || "No informado", lineas: [
        { concepto: "Derecho de importación (DIE)", base_formula: usd(item.cif_usd), tasa: pct(tax.rates.duty), importe: usd(item.derechos_usd) },
        { concepto: "Tasa de Estadística", base_formula: usd(item.cif_usd), tasa: pct(tax.rates.statistical), importe: usd(item.tasa_estadistica_usd) },
        { concepto: "Base imponible de IVA", base_formula: "CIF + DIE + Tasa de Estadística", tasa: "—", importe: usd(item.base_iva_usd) },
        { concepto: "IVA", base_formula: usd(item.base_iva_usd), tasa: pct(tax.rates.vat), importe: usd(item.iva_usd) },
      ] };
    }),
    totales: [
      { concepto: "Derechos", base_formula: "Suma por producto", tasa: "—", importe: usd(a.derechos_usd) },
      { concepto: "Tasa de Estadística", base_formula: "Suma por producto", tasa: "—", importe: usd(a.tasa_estadistica_usd) },
      { concepto: "IVA", base_formula: "Suma por producto", tasa: "—", importe: usd(a.iva_usd) },
      { concepto: "Débitos/créditos", base_formula: "Derechos + TE + IVA", tasa: "1,2%", importe: usd(a.debitos_creditos_usd) },
      { concepto: "Handling", base_formula: "Cargo fijo", tasa: "—", importe: usd(a.handling_usd) },
      { concepto: "IVA handling", base_formula: usd(a.handling_usd), tasa: "21%", importe: usd(a.iva_handling_usd) },
      { concepto: "Total final", base_formula: "Flete + tributos + débitos/créditos + handling con IVA", tasa: "—", importe: usd(response.total_usd) },
    ],
  };
}
