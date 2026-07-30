"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  publicPedidoSchema,
  claimPedidoSchema,
  releasePedidoSchema,
  cancelPedidoSchema,
} from "@/lib/validations/pedido";
import { createSaleSchema } from "@/lib/validations/sale";
import {
  createPublicPedido,
  claimPedido,
  releasePedido,
  cancelPedido,
  convertPedidoToSale,
  RateLimitedError,
  PedidoAlreadyClaimedError,
  PedidoNotClaimableError,
  PedidoNotFoundError,
} from "@/lib/pedidos";
import { InsufficientStockError } from "@/lib/inventory";
import { z } from "zod";

// The ONLY Server Action in this codebase with no auth()/role check —
// intentional, not a missed check: this is the public landing page's
// pedido/cotización form, submitted anonymously with no session to
// verify. Rate limiting (by IP, inside createPublicPedido) and the
// honeypot check below are the actual defense here.
export async function submitPedidoAction(input: unknown) {
  const parsed = publicPedidoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  // Honeypot: real visitors never fill this hidden field. Skip the
  // database entirely and report fake success so a bot doesn't learn
  // its submission was rejected and adapt.
  if (parsed.data.website && parsed.data.website.trim().length > 0) {
    return { success: true as const, data: null };
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  try {
    await createPublicPedido(parsed.data, { ip });
    return { success: true as const, data: null };
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return { success: false as const, error: "rate_limited" };
    }
    throw error;
  }
}

export async function claimPedidoAction(input: unknown) {
  const session = await auth();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = claimPedidoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const pedido = await claimPedido(parsed.data.id, session.user.id, {
      isAdmin: session.user.role === "ADMIN",
      sellerCity: session.user.city,
    });
    return { success: true as const, data: pedido };
  } catch (error) {
    if (error instanceof PedidoAlreadyClaimedError) {
      return { success: false as const, error: "already_claimed" };
    }
    throw error;
  }
}

export async function releasePedidoAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = releasePedidoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const pedido = await releasePedido(parsed.data.id, session.user.id);
    return { success: true as const, data: pedido };
  } catch (error) {
    if (error instanceof PedidoNotClaimableError) {
      return { success: false as const, error: "not_claimable" };
    }
    throw error;
  }
}

export async function cancelPedidoAction(input: unknown) {
  const session = await auth();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = cancelPedidoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const pedido = await cancelPedido(
      parsed.data.id,
      session.user.id,
      { isAdmin: session.user.role === "ADMIN" },
      parsed.data.reason,
    );
    return { success: true as const, data: pedido };
  } catch (error) {
    if (error instanceof PedidoNotClaimableError) {
      return { success: false as const, error: "not_claimable" };
    }
    throw error;
  }
}

const convertPedidoSchema = z.object({
  pedidoId: z.uuid(),
  saleInput: createSaleSchema,
});

export async function convertPedidoAction(input: unknown) {
  const session = await auth();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = convertPedidoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const sale = await convertPedidoToSale(
      parsed.data.pedidoId,
      parsed.data.saleInput,
      session.user.id,
      session.user.role === "ADMIN",
    );
    return { success: true as const, data: sale };
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return { success: false as const, error: "insufficient_stock" };
    }
    if (error instanceof PedidoNotClaimableError) {
      return { success: false as const, error: "not_claimable" };
    }
    if (error instanceof PedidoNotFoundError) {
      return { success: false as const, error: "not_found" };
    }
    throw error;
  }
}
