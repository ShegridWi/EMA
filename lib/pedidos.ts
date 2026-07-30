import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { createSale, serializeSale } from "@/lib/inventory";
import type { City, RequestStatus, RequestKind } from "@/app/generated/prisma/enums";
import type { PublicRequest } from "@/app/generated/prisma/client";
import type { PublicPedidoInput } from "@/lib/validations/pedido";
import type { CreateSaleInput } from "@/lib/validations/sale";

// This is the only file allowed to call `prisma.publicRequest.*` (same
// rule lib/inventory.ts follows for Material/Product/Sale — CLAUDE.md
// section 7).

// Rate limiting thresholds for anonymous submissions from the same IP
// (see submitPedidoAction in lib/actions/pedidos.ts, which is the first
// Server Action in this codebase with no auth() check — this is the real
// defense in its place). Named constants so they're easy to retune
// without touching call sites.
const RATE_LIMIT_SHORT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_SHORT_MAX = 3;
const RATE_LIMIT_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_DAILY_MAX = 10;

export class RateLimitedError extends Error {
  constructor() {
    super("Too many requests from this origin");
    this.name = "RateLimitedError";
  }
}

export class PedidoAlreadyClaimedError extends Error {
  constructor(public readonly pedidoId: string) {
    super(`Pedido ${pedidoId} is no longer pending`);
    this.name = "PedidoAlreadyClaimedError";
  }
}

export class PedidoNotClaimableError extends Error {
  constructor(public readonly pedidoId: string) {
    super(`Pedido ${pedidoId} cannot be actioned in its current state`);
    this.name = "PedidoNotClaimableError";
  }
}

export class PedidoNotFoundError extends Error {
  constructor(public readonly pedidoId: string) {
    super(`Pedido not found: ${pedidoId}`);
    this.name = "PedidoNotFoundError";
  }
}

// Derives ORDER vs QUOTE server-side from whether a size was selected —
// never trusts a client-supplied kind (lib/validations/pedido.ts doesn't
// even accept one). No MovementLog entry here: MovementLog.userId is a
// required FK and there is no acting user for an anonymous submission;
// the row's own createdAt/submissionIp is the only record of this event.
// Auditing starts at the claim step below, where a real seller/admin acts.
export async function createPublicPedido(
  input: PublicPedidoInput,
  meta: { ip: string },
): Promise<PublicRequest> {
  // `input.website` (the honeypot) is already checked by the caller
  // (submitPedidoAction) before this is ever invoked — nothing here
  // needs to read it.
  const data = input;
  const kind: RequestKind = data.size ? "ORDER" : "QUOTE";

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const [shortCount, dailyCount] = await Promise.all([
      tx.publicRequest.count({
        where: {
          submissionIp: meta.ip,
          createdAt: { gte: new Date(now.getTime() - RATE_LIMIT_SHORT_WINDOW_MS) },
        },
      }),
      tx.publicRequest.count({
        where: {
          submissionIp: meta.ip,
          createdAt: { gte: new Date(now.getTime() - RATE_LIMIT_DAILY_WINDOW_MS) },
        },
      }),
    ]);
    if (shortCount >= RATE_LIMIT_SHORT_MAX || dailyCount >= RATE_LIMIT_DAILY_MAX) {
      throw new RateLimitedError();
    }

    return tx.publicRequest.create({
      data: {
        kind,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        notes: data.notes,
        gender: data.gender,
        model: data.model,
        color: data.color,
        size: data.size,
        city: data.city,
        quantity: data.quantity,
        estimatedQuantity: data.estimatedQuantity,
        usageContext: data.usageContext,
        desiredTimeframe: data.desiredTimeframe,
        additionalDetails: data.additionalDetails,
        submissionIp: meta.ip,
      },
    });
  });
}

export type PedidoFilters = {
  city?: City;
  status?: RequestStatus;
  kind?: RequestKind;
};

// Pending-first ordering: this app has no pagination anywhere (small
// low-traffic datasets throughout), so the simplest correct approach is
// a plain findMany followed by an in-memory sort by a fixed status
// priority, rather than fighting Prisma's alphabetical-only enum orderBy.
const STATUS_PRIORITY: Record<RequestStatus, number> = {
  PENDING: 0,
  ATTENDED: 1,
  CONVERTED: 2,
  CANCELLED: 3,
};

export async function listPedidos(filters: PedidoFilters = {}) {
  const { city, status, kind } = filters;

  const pedidos = await prisma.publicRequest.findMany({
    where: {
      ...(city ? { city } : {}),
      ...(status ? { status } : {}),
      ...(kind ? { kind } : {}),
    },
    include: { assignedSeller: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return [...pedidos].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
  );
}

export function getPedidoById(id: string) {
  return prisma.publicRequest.findUnique({
    where: { id },
    include: { assignedSeller: { select: { name: true } } },
  });
}

export type PedidoNotification = {
  id: string;
  kind: RequestKind;
  customerName: string;
  city: City;
  createdAt: Date;
};

// Capped list (not just a count) for the admin header's notification
// dropdown — see components/pedido-notifications.tsx. Which ones the
// viewer has already opened is tracked client-side (localStorage), not
// here: a pedido stays PENDING/visible to every other eligible seller
// regardless of whether one of them already looked at it, so "seen" is
// a per-browser convenience, not a change to the row itself.
const NOTIFICATIONS_LIMIT = 20;

export function listPedidoNotifications(city?: City): Promise<PedidoNotification[]> {
  return prisma.publicRequest.findMany({
    where: { status: "PENDING", ...(city ? { city } : {}) },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATIONS_LIMIT,
    select: { id: true, kind: true, customerName: true, city: true, createdAt: true },
  });
}

// "First click wins": the WHERE clause below (status must still be
// PENDING, and — for non-admins — city must match the seller's own
// city) is what makes the claim atomic without needing a row lock. If
// the update matched zero rows, someone else already claimed it (or an
// out-of-city seller tried), so we throw rather than silently no-op.
export async function claimPedido(
  id: string,
  sellerId: string,
  scope: { isAdmin: boolean; sellerCity: City },
): Promise<PublicRequest> {
  return prisma.$transaction(async (tx) => {
    const result = await tx.publicRequest.updateMany({
      where: {
        id,
        status: "PENDING",
        ...(scope.isAdmin ? {} : { city: scope.sellerCity }),
      },
      data: {
        status: "ATTENDED",
        assignedSellerId: sellerId,
        assignedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      throw new PedidoAlreadyClaimedError(id);
    }

    const pedido = await tx.publicRequest.findUniqueOrThrow({ where: { id } });

    await writeAuditLog(tx, {
      userId: sellerId,
      action: "CLAIM_PEDIDO",
      entityType: "PublicRequest",
      entityId: id,
      metadata: {},
    });

    return pedido;
  });
}

// Admin-only escape hatch for a mis-claim: puts the pedido back in the
// pending queue for any eligible seller to claim again.
export async function releasePedido(id: string, actingUserId: string): Promise<PublicRequest> {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.publicRequest.findUnique({ where: { id } });
    if (!pedido || pedido.status !== "ATTENDED") {
      throw new PedidoNotClaimableError(id);
    }

    const updated = await tx.publicRequest.update({
      where: { id },
      data: { status: "PENDING", assignedSellerId: null, assignedAt: null },
    });

    await writeAuditLog(tx, {
      userId: actingUserId,
      action: "RELEASE_PEDIDO",
      entityType: "PublicRequest",
      entityId: id,
      metadata: {},
    });

    return updated;
  });
}

export async function cancelPedido(
  id: string,
  actingUserId: string,
  scope: { isAdmin: boolean },
  reason?: string,
): Promise<PublicRequest> {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.publicRequest.findUnique({ where: { id } });
    if (!pedido || (pedido.status !== "PENDING" && pedido.status !== "ATTENDED")) {
      throw new PedidoNotClaimableError(id);
    }
    if (!scope.isAdmin && pedido.assignedSellerId !== actingUserId) {
      throw new PedidoNotClaimableError(id);
    }

    const updated = await tx.publicRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await writeAuditLog(tx, {
      userId: actingUserId,
      action: "CANCEL_PEDIDO",
      entityType: "PublicRequest",
      entityId: id,
      metadata: reason ? { reason } : {},
    });

    return updated;
  });
}

// Converts an ATTENDED pedido into a real Sale, reusing the existing,
// untouched createSale from lib/inventory.ts rather than duplicating
// sale-creation logic. Deliberately two transactions, not one spanning
// both tables — createSale opens its own $transaction internally, and
// refactoring its signature to accept an external `tx` was rejected to
// avoid touching a money-critical, already-tested function for a
// non-financial side effect. Accepted risk: a crash between the two
// steps could leave a correctly-created Sale with the pedido still
// showing ATTENDED — no money/stock at risk, an admin can fix the
// pedido row manually.
export async function convertPedidoToSale(
  pedidoId: string,
  saleInput: CreateSaleInput,
  sellerId: string,
  isAdmin: boolean,
) {
  const pedido = await prisma.publicRequest.findUnique({ where: { id: pedidoId } });
  if (!pedido) {
    throw new PedidoNotFoundError(pedidoId);
  }
  if (pedido.status !== "ATTENDED") {
    throw new PedidoNotClaimableError(pedidoId);
  }
  if (!isAdmin && pedido.assignedSellerId !== sellerId) {
    throw new PedidoNotClaimableError(pedidoId);
  }

  const sale = await createSale(saleInput, sellerId);

  await prisma.$transaction(async (tx) => {
    await tx.publicRequest.update({
      where: { id: pedidoId },
      data: { status: "CONVERTED", convertedSaleId: sale.id },
    });

    await writeAuditLog(tx, {
      userId: sellerId,
      action: "CONVERT_PEDIDO",
      entityType: "PublicRequest",
      entityId: pedidoId,
      metadata: { saleId: sale.id },
    });
  });

  return serializeSale(sale);
}
