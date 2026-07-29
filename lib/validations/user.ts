import { z } from "zod";
import { Role, City } from "@/app/generated/prisma/enums";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8),
  role: z.enum(Role),
  city: z.enum(City),
});

// `password` is optional here — an empty/omitted value means "keep the
// current password". Server-side (lib/users.ts) only rehashes and writes
// it when present, same idea as `colorOptional` elsewhere: an empty form
// field must not overwrite a real value with an empty one.
export const updateUserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(8).optional(),
  role: z.enum(Role),
  city: z.enum(City),
});

export const deactivateUserSchema = z.object({
  id: z.uuid(),
});

// `reason` is optional — a free-text note on why the account is being
// restored (e.g. "se confirmó que fue un error" / "vuelve de licencia"),
// same shape as lib/validations/sale.ts's reverseSaleSchema.
export const reactivateUserSchema = z.object({
  id: z.uuid(),
  reason: z.string().min(1).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;
export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>;
