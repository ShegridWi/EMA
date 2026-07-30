import { z } from "zod";
import { City, LandingGender, Size } from "@/app/generated/prisma/enums";
import { isColorForGender, isModelKey } from "@/lib/landing-catalog";

// Public, anonymous submission from the landing page's pedido/cotización
// form. Deliberately does NOT accept a `kind`/`requestType` field from the
// client — lib/pedidos.ts derives ORDER vs QUOTE server-side from whether
// `size` is present, so a tampered hidden field can't misclassify a
// submission. `website` is an off-screen honeypot: real visitors never
// fill it, so any non-empty value marks the submission as a bot (see
// lib/actions/pedidos.ts).
export const publicPedidoSchema = z
  .object({
    customerName: z.string().trim().min(1).max(200),
    customerPhone: z.string().trim().min(1).max(40),
    notes: z.string().trim().min(1).max(2000),

    gender: z.enum(LandingGender),
    model: z.string().min(1).max(60),
    color: z.string().min(1).max(60),
    size: z.enum(Size).optional(),
    city: z.enum(City),

    quantity: z.coerce.number().int().positive().optional(),

    estimatedQuantity: z.string().trim().max(200).optional(),
    usageContext: z.string().trim().max(200).optional(),
    desiredTimeframe: z.string().trim().max(200).optional(),
    additionalDetails: z.string().trim().max(2000).optional(),

    website: z.string().optional(),
  })
  .refine((data) => isModelKey(data.model), {
    message: "Unknown model",
    path: ["model"],
  })
  .refine((data) => isColorForGender(data.gender === "MALE" ? "male" : "female", data.color), {
    message: "Unknown color for this gender",
    path: ["color"],
  });

export type PublicPedidoInput = z.infer<typeof publicPedidoSchema>;

export const claimPedidoSchema = z.object({
  id: z.uuid(),
});
export type ClaimPedidoInput = z.infer<typeof claimPedidoSchema>;

export const releasePedidoSchema = z.object({
  id: z.uuid(),
});
export type ReleasePedidoInput = z.infer<typeof releasePedidoSchema>;

export const cancelPedidoSchema = z.object({
  id: z.uuid(),
  reason: z.string().min(1).optional(),
});
export type CancelPedidoInput = z.infer<typeof cancelPedidoSchema>;
