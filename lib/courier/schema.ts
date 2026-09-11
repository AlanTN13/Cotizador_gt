import { z } from "zod";
const positive = z.number().finite().positive();
const product = z
  .object({
    description: z.string().trim().max(2500).default(""),
    url: z.union([z.literal(""), z.string().url().max(2000)]).default(""),
    quantity: positive.int().max(100000),
    valueUsd: positive.max(1000000),
    origin: z.string().trim().min(2).max(80),
    attributes: z.record(z.string().max(100), z.string().max(300)).default({}),
  })
  .strict()
  .refine(
    (p) => p.description.length >= 3 || p.url.length > 0,
    "Describí el producto o agregá su link.",
  );
export const submissionSchema = z
  .object({
    requestId: z.string().uuid(),
    products: z.array(product).min(1).max(10),
    parcels: z
      .array(
        z
          .object({
            quantity: positive.int().max(100),
            width: positive.max(1000),
            height: positive.max(1000),
            length: positive.max(1000),
            grossWeight: positive.max(10000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
    contact: z
      .object({
        name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(254),
      })
      .strict(),
    route: z.literal("CN-BUE"),
    condition: z.literal("new"),
    purpose: z.literal("commercial"),
    reference: z.boolean().default(false),
    website: z.string().max(200).default(""),
  })
  .strict();
