import { z } from "zod";
import { City, Size } from "@/app/generated/prisma/enums";

// Standalone piece (top/bottom/cap on its own) or the shape reused to
// edit any existing Product row, set or unit (01-business-rules.md #2b).
export const createUnitProductSchema = z.object({
  description: z.string().min(1),
  color: z.string().min(1),
  size: z.enum(Size),
  quantity: z.coerce.number().int().nonnegative(),
  price: z.coerce.number().nonnegative(),
  city: z.enum(City),
});

// A set always has Top + Bottom; Cap is optional
// (01-business-rules.md #2a). Quantities default to 0 (no loose pieces
// yet) unless the admin already has stock for a piece.
export const createSetProductSchema = z.object({
  description: z.string().min(1),
  color: z.string().min(1),
  size: z.enum(Size),
  price: z.coerce.number().nonnegative(),
  city: z.enum(City),
  topQuantity: z.coerce.number().int().nonnegative(),
  bottomQuantity: z.coerce.number().int().nonnegative(),
  includeCap: z.coerce.boolean().default(false),
  capQuantity: z.coerce.number().int().nonnegative().default(0),
});

// kind/setId/pieceRole are structural and set once at creation — editing
// a product (set container or a single piece) only ever touches its
// descriptive/stock fields.
export const updateProductSchema = createUnitProductSchema.extend({
  id: z.uuid(),
});

export type CreateUnitProductInput = z.infer<typeof createUnitProductSchema>;
export type CreateSetProductInput = z.infer<typeof createSetProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
