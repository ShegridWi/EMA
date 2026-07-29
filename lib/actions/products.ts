"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  createUnitProductSchema,
  createSetProductSchema,
  updateProductSchema,
} from "@/lib/validations/product";
import {
  createUnitProduct,
  createSetProduct,
  updateProduct,
  deleteProduct,
  serializeProduct,
} from "@/lib/inventory";

export async function createUnitProductAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = createUnitProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const product = await createUnitProduct(parsed.data, session.user.id);
  return { success: true as const, data: serializeProduct(product) };
}

export async function createSetProductAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = createSetProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const { set, pieces } = await createSetProduct(
    parsed.data,
    session.user.id,
  );
  return {
    success: true as const,
    data: {
      set: serializeProduct(set),
      pieces: pieces.map(serializeProduct),
    },
  };
}

export async function updateProductAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const product = await updateProduct(parsed.data, session.user.id);
  return { success: true as const, data: serializeProduct(product) };
}

const deleteProductSchema = z.object({ id: z.uuid() });

export async function deleteProductAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = deleteProductSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const product = await deleteProduct(parsed.data.id, session.user.id);
  return { success: true as const, data: serializeProduct(product) };
}
