import { z } from "zod";
import { City, Unit } from "@/app/generated/prisma/enums";

export const createMaterialSchema = z.object({
  materialType: z.string().min(1),
  color: z.string().min(1).optional(),
  type: z.string().min(1),
  quantity: z.coerce.number().nonnegative(),
  unit: z.enum(Unit),
  city: z.enum(City),
  purchasePrice: z.coerce.number().nonnegative(),
});

export const updateMaterialSchema = createMaterialSchema.extend({
  id: z.uuid(),
});

export const deactivateMaterialSchema = z.object({ id: z.uuid() });

// `reason` is optional — a free-text note on why the material is being
// restored, same shape as lib/validations/product.ts's
// reactivateProductSchema.
export const reactivateMaterialSchema = z.object({
  id: z.uuid(),
  reason: z.string().min(1).optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type DeactivateMaterialInput = z.infer<typeof deactivateMaterialSchema>;
export type ReactivateMaterialInput = z.infer<typeof reactivateMaterialSchema>;
