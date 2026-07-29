"use server";

import { auth } from "@/lib/auth";
import { createSaleSchema } from "@/lib/validations/sale";
import {
  createSale,
  serializeSale,
  InsufficientStockError,
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
