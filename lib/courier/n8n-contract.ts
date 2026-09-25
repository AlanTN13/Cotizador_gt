import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const positive = z.number().finite().positive().max(1e9);
export const courierRequestSchema = z.object({
  solicitud_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  productos: z.array(z.object({ link: z.string().trim().max(2048), descripcion: text(8000) })).min(1),
  fob_usd: positive,
  cantidad: z.number().int().min(1).max(1000000),
  bultos: z.array(z.object({
    cantidad: z.number().int().min(1).max(1000),
    peso_kg: positive, largo_cm: positive, ancho_cm: positive, alto_cm: positive,
  })).min(1).max(100),
});
const base = z.object({
  solicitud_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  mensaje: text(8000),
  codigo: z.string().max(100).optional(),
});
const money = z.number().finite().nonnegative();
// Unknown fields (including the internal audit) are stripped before reaching the browser.
export const courierResponseSchema = z.discriminatedUnion("status", [
  base.extend({ status: z.literal("cotizado"), total_usd: money,
    flete_internacional_usd: money, handling_con_iva_usd: money, impuestos_y_tasas_usd: money,
    peso_considerado_kg: z.number().finite().positive(),
  }),
  base.extend({ status: z.literal("error") }),
]);
const rate = z.number().finite().min(0).max(1);
const auditProduct = z.object({ indice: z.number().int().positive(), producto: text(8000) }).passthrough();
const taxResolution = z.object({ productIndex: z.number().int().nonnegative(), ncm: z.string().nullable(), sim: z.string().nullable(),
  rates: z.object({ duty: rate, statistical: rate, vat: rate }), agentEvidence: z.object({ producto: text(8000) }).passthrough(),
}).passthrough();
const productTax = z.object({ indice: z.number().int().positive(), cif_usd: money, derechos_usd: money,
  tasa_estadistica_usd: money, base_iva_usd: money, iva_usd: money });
export const courierUpstreamResponseSchema = z.discriminatedUnion("status", [
  base.extend({ status: z.literal("cotizado"), total_usd: money, flete_internacional_usd: money,
    handling_con_iva_usd: money, impuestos_y_tasas_usd: money, peso_considerado_kg: z.number().finite().positive(),
    auditoria: z.object({ productos: z.array(auditProduct).min(1), taxResolutions: z.array(taxResolution).min(1),
      tributos_por_producto: z.array(productTax).min(1), peso_real_total_kg: money, peso_volumetrico_total_kg: money,
      peso_real_redondeado_kg: money, peso_volumetrico_redondeado_kg: money, tarifa_usd_kg: money,
      flete_aduanero_usd: money, seguro_aduanero_usd: money, cif_usd: money, derechos_usd: money,
      tasa_estadistica_usd: money, iva_usd: money, debitos_creditos_usd: money, handling_usd: money,
      iva_handling_usd: money }).passthrough(),
  }),
  base.extend({ status: z.literal("error") }).passthrough(),
]);
const detailLine = z.object({ concepto: z.string(), base_formula: z.string(), tasa: z.string(), importe: z.string() });
export const calculationDetailSchema = z.object({ resumen: z.array(detailLine), productos: z.array(z.object({ producto: z.string(), ncm_sim: z.string(), lineas: z.array(detailLine) })), totales: z.array(detailLine) });
export const courierDebugResponseSchema = z.discriminatedUnion("status", [
  courierResponseSchema.options[0].extend({ detalle_calculo: calculationDetailSchema }),
  courierResponseSchema.options[1],
]);
export type CourierRequest = z.infer<typeof courierRequestSchema>;
export type CourierResponse = z.infer<typeof courierResponseSchema>;
export type CourierDebugResponse = z.infer<typeof courierDebugResponseSchema>;
export type CalculationDetail = z.infer<typeof calculationDetailSchema>;
export type CourierUpstreamResponse = z.infer<typeof courierUpstreamResponseSchema>;
