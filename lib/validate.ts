// lib/validate.ts
import { z } from "zod";

export const CheckerSchema = z.object({
  nombre: z.string().min(1),
  email: z.string().email(),
  telefono: z.string().optional().default(""),
  origen: z.string().min(1),
  destino: z.string().min(1),
  producto_descripcion: z.string().optional().default(""),
  producto_link: z.string().optional().default(""),
  _hp: z.string().optional().default(""),
});

export type CheckerPayload = z.infer<typeof CheckerSchema>;
export function validateCheckerPayload(body: unknown): CheckerPayload {
  return CheckerSchema.parse(body);
}
