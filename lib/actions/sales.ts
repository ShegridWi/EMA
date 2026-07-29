"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { createSaleSchema } from "@/lib/validations/sale";
import {
  createSale,
  returnSale,
  voidSale,
  serializeSale,
  InsufficientStockError,
  SaleNotFoundError,
} from "@/lib/inventory";

export async function createSaleAction(input: unknown) {
  const session = await auth();
  // Both ADMIN and SELLER can register sales (03-roles-permissions.md) —
  // any valid session qualifies, there's no third role.
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = createSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const sale = await createSale(parsed.data, session.user.id);
    return { success: true as const, data: serializeSale(sale) };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false as const, error: "insufficient_stock" };
    }
    throw error;
  }
}

const saleIdSchema = z.object({ id: z.uuid() });

// Marking a sale as returned or voiding it are ADMIN-only, always a soft
// delete on the Sale row, and always restore the stock createSale
// deducted (see lib/inventory.ts's reverseSale for why both share the
// same mechanics and only differ in which MovementAction gets logged).
export async function returnSaleAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = saleIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const sale = await returnSale(parsed.data.id, session.user.id);
    return { success: true as const, data: serializeSale(sale) };
  } catch (error) {
    if (error instanceof SaleNotFoundError) {
      return { success: false as const, error: "not_found" };
    }
    throw error;
  }
}

export async function voidSaleAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = saleIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const sale = await voidSale(parsed.data.id, session.user.id);
    return { success: true as const, data: serializeSale(sale) };
  } catch (error) {
    if (error instanceof SaleNotFoundError) {
      return { success: false as const, error: "not_found" };
    }
    throw error;
  }
}
