import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const positive = z.number().finite().positive().max(1e9);
export const clarificationSchema = z.object({ pregunta: text(3000), respuesta: text(3000) });
export const courierRequestSchema = z.object({
  solicitud_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  link: text(2048).refine((value) => {
    if (!/^https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?:[/?][^\s]*)?$/i.test(value)) return false;
    const host = new URL(value).hostname;
    return host.includes(".") && !/^[0-9.]+$/.test(host) && !/(^|\.)(localhost|local|internal|invalid)$/.test(host);
  }, "Pegá un link HTTPS público del producto."),
  descripcion: text(8000),
  fob_usd: positive,
  cantidad: z.number().int().min(1).max(1000000),
  bultos: z.array(z.object({
    cantidad: z.number().int().min(1).max(1000),
    peso_kg: positive, largo_cm: positive, ancho_cm: positive, alto_cm: positive,
  })).min(1).max(100),
  aclaraciones: z.array(clarificationSchema).max(50).default([]),
});
const question = z.object({ id: text(1000), pregunta: text(1000), motivo: text(1000) });
const base = z.object({
  solicitud_id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  mensaje: text(8000),
  codigo: z.string().max(100).nullable().optional(),
});
const money = z.number().finite().nonnegative();
export const courierResponseSchema = z.discriminatedUnion("status", [
  base.extend({ status: z.literal("cotizado"), total_usd: money,
    flete_internacional_usd: money, handling_con_iva_usd: money, impuestos_y_tasas_usd: money,
    peso_considerado_kg: z.number().finite().positive(), SIM: z.string().regex(/^\d{11}[A-Z]$/),
    DIE: z.number().finite().min(0).max(100),
  }),
  base.extend({ status: z.literal("falta_info"), preguntas_faltantes: z.array(question).min(1).max(3).refine(qs => new Set(qs.map(q => q.id)).size === qs.length) }),
  base.extend({ status: z.literal("revision") }),
  base.extend({ status: z.literal("no_apto") }),
]);
export type CourierRequest = z.infer<typeof courierRequestSchema>;
export type CourierResponse = z.infer<typeof courierResponseSchema>;
export type Clarification = z.infer<typeof clarificationSchema>;
