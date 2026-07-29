"use server";

import { auth } from "@/lib/auth";
import {
  createMaterialSchema,
  updateMaterialSchema,
} from "@/lib/validations/material";
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
} from "@/lib/inventory";
import { z } from "zod";

export async function createMaterialAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const material = await createMaterial(parsed.data, session.user.id);
  return { success: true as const, data: material };
}

export async function updateMaterialAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = updateMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const material = await updateMaterial(parsed.data, session.user.id);
  return { success: true as const, data: material };
}

const deleteMaterialSchema = z.object({ id: z.uuid() });

export async function deleteMaterialAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = deleteMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const material = await deleteMaterial(parsed.data.id, session.user.id);
  return { success: true as const, data: material };
}
