import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import type {
  City,
  Size,
  PieceRole,
  MovementAction,
  StockMovementReason,
} from "@/app/generated/prisma/enums";
import type {
  Material,
  Product,
  Sale,
  Prisma,
} from "@/app/generated/prisma/client";
import type {
  CreateMaterialInput,
  UpdateMaterialInput,
} from "@/lib/validations/material";
import type {
  CreateUnitProductInput,
  CreateSetProductInput,
  UpdateProductInput,
} from "@/lib/validations/product";
import type { CreateSaleInput } from "@/lib/validations/sale";

// This is the only file allowed to call `prisma.material.*` /
// `prisma.product.*` / `prisma.sale.*` (CLAUDE.md section 7). Every
// mutation wraps the write(s) and the MovementLog insert(s) in the same
// `prisma.$transaction`, so they commit or roll back together.

// Writes one ProductStockMovement row using an already-open transaction
// client — same "never opens its own transaction" rule as
// lib/audit.ts's writeAuditLog. Called by every function below that
// changes Product.quantity (02-data-model.md "ProductStockMovement").
async function writeStockMovement(
  tx: Prisma.TransactionClient,
  entry: {
    productId: string;
    quantityBefore: number;
    quantityAfter: number;
    reason: StockMovementReason;
    userId: string;
    saleId?: string;
  },
) {
  await tx.productStockMovement.create({
    data: {
      productId: entry.productId,
      quantityBefore: entry.quantityBefore,
      quantityAfter: entry.quantityAfter,
      delta: entry.quantityAfter - entry.quantityBefore,
      reason: entry.reason,
      userId: entry.userId,
      saleId: entry.saleId,
    },
  });
}

export type SerializedMaterial = Omit<
  Material,
  "quantity" | "purchasePrice"
> & {
  quantity: string;
  purchasePrice: string;
};

// Prisma's `Decimal` is a class instance — React Server Components can't
// send it across the Server Action boundary to a Client Component
// ("Only plain objects can be passed... Decimal objects are not
// supported"). Anything returned as a Server Action's `data` must go
// through this first.
export function serializeMaterial(material: Material): SerializedMaterial {
  return {
    ...material,
    quantity: material.quantity.toString(),
    purchasePrice: material.purchasePrice.toString(),
  };
}

export type MaterialFilters = {
  search?: string;
  city?: City;
  // Both already-resolved UTC instants (phase 9b: the caller converts a
  // date-only form input via lib/timezone.ts's zonedTimeToUtc using the
  // viewing user's timezone — this layer only ever deals in UTC).
  createdFrom?: Date;
  createdTo?: Date;
};

export function listMaterials(filters: MaterialFilters = {}) {
  const { search, city, createdFrom, createdTo } = filters;

  return prisma.material.findMany({
    where: {
      deletedAt: null,
      ...(city ? { city } : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { materialType: { contains: search, mode: "insensitive" } },
              { type: { contains: search, mode: "insensitive" } },
              { color: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getMaterialById(id: string) {
  return prisma.material.findFirst({ where: { id, deletedAt: null } });
}

export async function createMaterial(
  input: CreateMaterialInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const material = await tx.material.create({
      data: { ...input, createdById: userId },
    });

    await writeAuditLog(tx, {
      userId,
      action: "CREATE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      metadata: input,
    });

    return material;
  });
}

export async function updateMaterial(
  input: UpdateMaterialInput,
  userId: string,
) {
  const { id, ...data } = input;

  return prisma.$transaction(async (tx) => {
    const material = await tx.material.update({
      where: { id },
      data,
    });

    await writeAuditLog(tx, {
      userId,
      action: "UPDATE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      metadata: data,
    });

    return material;
  });
}

export async function deleteMaterial(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const material = await tx.material.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog(tx, {
      userId,
      action: "DELETE_MATERIAL",
      entityType: "Material",
      entityId: material.id,
      metadata: {},
    });

    return material;
  });
}

// ---------------------------------------------------------------------
// Product (finished product — sets and individual pieces)
// ---------------------------------------------------------------------

export type SerializedProduct = Omit<Product, "price"> & { price: string };

export function serializeProduct(product: Product): SerializedProduct {
  return { ...product, price: product.price.toString() };
}

export type ProductFilters = {
  search?: string;
  city?: City;
  size?: Size;
  // Already-resolved UTC instants — see MaterialFilters above.
  createdFrom?: Date;
  createdTo?: Date;
  active?: boolean;
};

// `size` matches at the row level, including SET containers and their
// pieces independently. Pieces are only *guaranteed* to share their
// parent SET's size at creation time (createSetProduct copies it) —
// `updateProduct` allows editing `size` on any single row afterward,
// with no cross-row sync back to the set. In the rare case a piece's
// size has since diverged from its set, filtering by the set's size
// will render the set with that piece silently missing from its table
// (it reappears once the filter is cleared) — a narrow display quirk,
// not a data problem, not worth changing filter semantics over.
export function listProducts(filters: ProductFilters = {}) {
  const { search, city, size, createdFrom, createdTo, active } = filters;

  return prisma.product.findMany({
    where: {
      deletedAt: null,
      ...(city ? { city } : {}),
      ...(size ? { size } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(createdFrom || createdTo
        ? {
            createdAt: {
              ...(createdFrom ? { gte: createdFrom } : {}),
              ...(createdTo ? { lte: createdTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: "insensitive" } },
              { color: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getProductById(id: string) {
  return prisma.product.findFirst({ where: { id, deletedAt: null } });
}

export async function createUnitProduct(
  input: CreateUnitProductInput,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: { ...input, kind: "UNIT", createdById: userId },
    });

    await writeAuditLog(tx, {
      userId,
      action: "CREATE_PRODUCT",
      entityType: "Product",
      entityId: product.id,
      metadata: input,
    });

    if (product.quantity > 0) {
      await writeStockMovement(tx, {
        productId: product.id,
        quantityBefore: 0,
        quantityAfter: product.quantity,
        reason: "CREATED",
        userId,
      });
    }

    return product;
  });
}

// Suffix appended to the set's own description to name each generated
// piece (e.g. "Pijama Azul M" -> "Pijama Azul M - Top"). This is stored
// data the admin can edit afterward like any other product, not UI
// chrome, so it isn't run through next-intl.
const PIECE_DESCRIPTION_SUFFIX: Record<Extract<PieceRole, "TOP" | "BOTTOM" | "CAP">, string> = {
  TOP: "Top",
  BOTTOM: "Bottom",
  CAP: "Gorro",
};

/**
 * Creates a SET product and its Top/Bottom (+ optional Cap) UNIT pieces
 * in one transaction (01-business-rules.md #2a). The SET row is a
 * grouping/metadata record only — it carries no stock of its own
 * (02-data-model.md "Design note"), so its `quantity` is always 0; the
 * real stock lives on the pieces. Whether to also show a computed
 * "N complete sets available" number was an open assumption
 * (04-scope-mvp.md), decided against for now — pieces are listed with
 * their own stock instead.
 *
 * One MovementLog entry is written per created row (the set + each
 * piece), matching the "one log entry per entity row" pattern used
 * everywhere else in this file.
 */
export async function createSetProduct(
  input: CreateSetProductInput,
  userId: string,
) {
  const {
    topQuantity,
    bottomQuantity,
    includeCap,
    capQuantity,
    ...setFields
  } = input;

  return prisma.$transaction(async (tx) => {
    const set = await tx.product.create({
      data: { ...setFields, kind: "SET", quantity: 0, createdById: userId },
    });

    await writeAuditLog(tx, {
      userId,
      action: "CREATE_PRODUCT",
      entityType: "Product",
      entityId: set.id,
      metadata: { ...setFields, kind: "SET" },
    });

    const pieceSpecs: { pieceRole: PieceRole; quantity: number }[] = [
      { pieceRole: "TOP", quantity: topQuantity },
      { pieceRole: "BOTTOM", quantity: bottomQuantity },
    ];
    if (includeCap) {
      pieceSpecs.push({ pieceRole: "CAP", quantity: capQuantity });
    }

    const pieces = [];
    for (const spec of pieceSpecs) {
      const piece = await tx.product.create({
        data: {
          kind: "UNIT",
          description: `${setFields.description} - ${PIECE_DESCRIPTION_SUFFIX[spec.pieceRole as "TOP" | "BOTTOM" | "CAP"]}`,
          color: setFields.color,
          size: setFields.size,
          quantity: spec.quantity,
          price: setFields.price,
          city: setFields.city,
          setId: set.id,
          pieceRole: spec.pieceRole,
          createdById: userId,
        },
      });

      await writeAuditLog(tx, {
        userId,
        action: "CREATE_PRODUCT",
        entityType: "Product",
        entityId: piece.id,
        metadata: {
          pieceRole: spec.pieceRole,
          quantity: spec.quantity,
          setId: set.id,
        },
      });

      // The SET container itself never carries real stock (always
      // created with quantity: 0 above), so it never gets a
      // ProductStockMovement row — only its pieces do.
      if (piece.quantity > 0) {
        await writeStockMovement(tx, {
          productId: piece.id,
          quantityBefore: 0,
          quantityAfter: piece.quantity,
          reason: "CREATED",
          userId,
        });
      }

      pieces.push(piece);
    }

    return { set, pieces };
  });
}

export async function updateProduct(input: UpdateProductInput, userId: string) {
  const { id, ...data } = input;

  return prisma.$transaction(async (tx) => {
    // Read the current quantity *inside* the transaction, before the
    // update, so the before/after pair in the ProductStockMovement row
    // below can't race with a concurrent write.
    const existing = await tx.product.findUniqueOrThrow({ where: { id } });

    const product = await tx.product.update({
      where: { id },
      data,
    });

    await writeAuditLog(tx, {
      userId,
      action: "UPDATE_PRODUCT",
      entityType: "Product",
      entityId: product.id,
      metadata: data,
    });

    if (product.quantity !== existing.quantity) {
      await writeStockMovement(tx, {
        productId: product.id,
        quantityBefore: existing.quantity,
        quantityAfter: product.quantity,
        reason: "MANUAL_ADJUSTMENT",
        userId,
      });
    }

    return product;
  });
}

export async function deleteProduct(id: string, userId: string) {
  // Soft-deletes only this row. Deleting a SET's container row does NOT
  // cascade to its pieces — each piece is independently sellable
  // (01-business-rules.md #2a point 3) and keeps its own lifecycle.
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog(tx, {
      userId,
      action: "DELETE_PRODUCT",
      entityType: "Product",
      entityId: product.id,
      metadata: {},
    });

    return product;
  });
}

// `active` (phase 9) is a separate, reversible concept from the
// deletedAt soft delete above — e.g. discontinued/out of production but
// might come back, versus a permanent removal from the catalog. Same
// independent-row rule as delete: deactivating a SET's container row
// does not cascade to its pieces.
export async function deactivateProduct(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: { active: false },
    });

    await writeAuditLog(tx, {
      userId,
      action: "DEACTIVATE_PRODUCT",
      entityType: "Product",
      entityId: product.id,
      metadata: {},
    });

    return product;
  });
}

// `reason` is an optional free-text note on why the product is being
// restored — same idea as reactivateUser's reason (lib/users.ts).
export async function reactivateProduct(
  id: string,
  userId: string,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data: { active: true },
    });

    await writeAuditLog(tx, {
      userId,
      action: "REACTIVATE_PRODUCT",
      entityType: "Product",
      entityId: product.id,
      metadata: reason ? { reason } : {},
    });

    return product;
  });
}

// ---------------------------------------------------------------------
// Sale
// ---------------------------------------------------------------------

export type SerializedSale = Omit<
  Sale,
  "unitPrice" | "totalPrice" | "amountPaid" | "balanceDue"
> & {
  unitPrice: string;
  totalPrice: string;
  amountPaid: string;
  balanceDue: string;
};

export function serializeSale(sale: Sale): SerializedSale {
  return {
    ...sale,
    unitPrice: sale.unitPrice.toString(),
    totalPrice: sale.totalPrice.toString(),
    amountPaid: sale.amountPaid.toString(),
    balanceDue: sale.balanceDue.toString(),
  };
}

// Pure calculation, no Prisma involved — kept separate so it can be unit
// tested directly (CLAUDE.md section 7: money-touching code needs tests).
// Rounds to 2 decimals (currency) — plain JS float math otherwise leaves
// drift (e.g. `99.99 - 50` is `49.989999999999995`), which would then get
// persisted as-is into the Decimal columns.
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function calculateSaleTotals(
  quantity: number,
  unitPrice: number,
  amountPaid: number,
) {
  const totalPrice = roundCurrency(quantity * unitPrice);
  const balanceDue = roundCurrency(totalPrice - amountPaid);
  return { totalPrice, balanceDue };
}

export class InsufficientStockError extends Error {
  constructor(public readonly productId: string) {
    super(`Insufficient stock for product ${productId}`);
    this.name = "InsufficientStockError";
  }
}

export type SaleFilters = {
  sellerId?: string;
};

export function listSales(filters: SaleFilters = {}) {
  return prisma.sale.findMany({
    where: {
      deletedAt: null,
      ...(filters.sellerId ? { sellerId: filters.sellerId } : {}),
    },
    // Only the seller's name, never the full User row (passwordHash etc.)
    include: { seller: { select: { name: true } } },
    orderBy: { saleDate: "desc" },
  });
}

export function getSaleById(id: string) {
  return prisma.sale.findFirst({ where: { id, deletedAt: null } });
}

/**
 * Registers a sale and deducts stock in one transaction
 * (01-business-rules.md #3). For a `kind = UNIT` product, only that row's
 * quantity is checked/decremented. For a `kind = SET` product, every
 * non-deleted piece (Top/Bottom/optional Cap) must have enough stock —
 * all pieces are decremented together, or none are (throws
 * InsufficientStockError, which rolls back the transaction and is caught
 * by the calling Server Action as a typed error, never an unhandled
 * exception).
 */
export async function createSale(input: CreateSaleInput, sellerId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, deletedAt: null },
    });
    if (!product) {
      throw new InsufficientStockError(input.productId);
    }

    // Collected here and written as ProductStockMovement rows *after*
    // the sale below is created — the sale doesn't exist yet at this
    // point, and each row needs to link to it via saleId.
    //
    // Known limitation, pre-dating this ledger (same as the
    // InsufficientStockError check above): `product.quantity` here is a
    // plain read with no row lock, so it carries the same
    // read-then-relative-decrement race as the stock check itself under
    // genuinely concurrent sales of the *same* product. The DB's
    // `{decrement: N}` keeps the actual `Product.quantity` arithmetically
    // correct either way, but in that narrow race the recorded
    // quantityBefore/quantityAfter pair could disagree with the true
    // commit order. Not fixed here — would mean adding row-level locking
    // across the whole sales path, out of scope for a stock-history
    // feature on a low-traffic internal tool.
    const stockChanges: {
      productId: string;
      quantityBefore: number;
      quantityAfter: number;
    }[] = [];

    if (product.kind === "UNIT") {
      if (product.quantity < input.quantity) {
        throw new InsufficientStockError(product.id);
      }
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: { decrement: input.quantity } },
      });
      stockChanges.push({
        productId: product.id,
        quantityBefore: product.quantity,
        quantityAfter: product.quantity - input.quantity,
      });
    } else {
      const pieces = await tx.product.findMany({
        where: { setId: product.id, deletedAt: null },
      });
      const hasEnoughStock =
        pieces.length > 0 &&
        pieces.every((piece) => piece.quantity >= input.quantity);
      if (!hasEnoughStock) {
        throw new InsufficientStockError(product.id);
      }
      for (const piece of pieces) {
        await tx.product.update({
          where: { id: piece.id },
          data: { quantity: { decrement: input.quantity } },
        });
        stockChanges.push({
          productId: piece.id,
          quantityBefore: piece.quantity,
          quantityAfter: piece.quantity - input.quantity,
        });
      }
    }

    const { totalPrice, balanceDue } = calculateSaleTotals(
      input.quantity,
      input.unitPrice,
      input.amountPaid,
    );

    const sale = await tx.sale.create({
      data: {
        productId: product.id,
        // Denormalized at sale time (01-business-rules.md #3) — these
        // must NOT be re-derived from Product later, the product can
        // change or be deleted afterward.
        kind: product.kind,
        description: product.description,
        color: product.color,
        size: product.size,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        totalPrice,
        city: input.city,
        saleDate: input.saleDate,
        saleType: input.saleType,
        paymentMethod: input.paymentMethod,
        amountPaid: input.amountPaid,
        balanceDue,
        deliveryDate: input.deliveryDate,
        sellerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        notes: input.notes,
      },
    });

    await writeAuditLog(tx, {
      userId: sellerId,
      action: "CREATE_SALE",
      entityType: "Sale",
      entityId: sale.id,
      metadata: {
        productId: product.id,
        kind: product.kind,
        quantity: input.quantity,
        totalPrice,
      },
    });

    for (const change of stockChanges) {
      await writeStockMovement(tx, {
        productId: change.productId,
        quantityBefore: change.quantityBefore,
        quantityAfter: change.quantityAfter,
        reason: "SALE",
        userId: sellerId,
        saleId: sale.id,
      });
    }

    return sale;
  });
}

export class SaleNotFoundError extends Error {
  constructor(public readonly saleId: string) {
    super(`Sale not found or already returned/voided: ${saleId}`);
    this.name = "SaleNotFoundError";
  }
}

/**
 * Shared implementation for "mark as return" and "void sale" — ADMIN
 * only, always soft delete (never `.delete()`). Both cases restore the
 * stock that `createSale` deducted (the item is either back in the
 * warehouse after a return, or the deduction shouldn't have happened at
 * all after a void) and are functionally identical except for which
 * MovementAction is logged, which is what lets reports later tell a
 * customer return apart from an admin correcting a mistake.
 */
async function reverseSale(
  id: string,
  userId: string,
  action: Extract<MovementAction, "RETURN_SALE" | "VOID_SALE">,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({ where: { id, deletedAt: null } });
    if (!sale) {
      throw new SaleNotFoundError(id);
    }

    // Not filtered by deletedAt: stock must stay accurate even if the
    // product itself was deactivated after the sale.
    const product = await tx.product.findUnique({
      where: { id: sale.productId },
    });

    // Collected here and written as ProductStockMovement rows after the
    // audit log below, same reasoning as createSale's stockChanges.
    const stockChanges: {
      productId: string;
      quantityBefore: number;
      quantityAfter: number;
    }[] = [];

    if (product) {
      if (product.kind === "UNIT") {
        await tx.product.update({
          where: { id: product.id },
          data: { quantity: { increment: sale.quantity } },
        });
        stockChanges.push({
          productId: product.id,
          quantityBefore: product.quantity,
          quantityAfter: product.quantity + sale.quantity,
        });
      } else {
        const pieces = await tx.product.findMany({
          where: { setId: product.id },
        });
        for (const piece of pieces) {
          await tx.product.update({
            where: { id: piece.id },
            data: { quantity: { increment: sale.quantity } },
          });
          stockChanges.push({
            productId: piece.id,
            quantityBefore: piece.quantity,
            quantityAfter: piece.quantity + sale.quantity,
          });
        }
      }
    }

    const updatedSale = await tx.sale.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog(tx, {
      userId,
      action,
      entityType: "Sale",
      entityId: sale.id,
      metadata: {
        productId: sale.productId,
        quantity: sale.quantity,
        ...(reason ? { reason } : {}),
      },
    });

    const stockReason: StockMovementReason =
      action === "RETURN_SALE" ? "RETURN" : "VOID";
    for (const change of stockChanges) {
      await writeStockMovement(tx, {
        productId: change.productId,
        quantityBefore: change.quantityBefore,
        quantityAfter: change.quantityAfter,
        reason: stockReason,
        userId,
        saleId: sale.id,
      });
    }

    return updatedSale;
  });
}

export function returnSale(id: string, userId: string, reason?: string) {
  return reverseSale(id, userId, "RETURN_SALE", reason);
}

export function voidSale(id: string, userId: string, reason?: string) {
  return reverseSale(id, userId, "VOID_SALE", reason);
}

export type ReversedSaleInfo = {
  sale: Sale & { seller: { name: string } };
  action: Extract<MovementAction, "RETURN_SALE" | "VOID_SALE">;
  reason: string | null;
  performedBy: string;
  reversedAt: Date;
};

/**
 * Sales tab's "Anulaciones" view: every returned/voided sale, alongside
 * who reversed it, when, and the optional reason — all of which live on
 * the RETURN_SALE/VOID_SALE MovementLog entry, not on the Sale row
 * itself (see reverseSale). A sale can only be reversed once (enforced
 * by SaleNotFoundError), so there's at most one matching log per sale.
 */
export async function listReversedSales(
  filters: SaleFilters = {},
): Promise<ReversedSaleInfo[]> {
  const sales = await prisma.sale.findMany({
    where: {
      deletedAt: { not: null },
      ...(filters.sellerId ? { sellerId: filters.sellerId } : {}),
    },
    include: { seller: { select: { name: true } } },
    orderBy: { deletedAt: "desc" },
  });

  if (sales.length === 0) return [];

  const logs = await prisma.movementLog.findMany({
    where: {
      entityType: "Sale",
      entityId: { in: sales.map((sale) => sale.id) },
      action: { in: ["RETURN_SALE", "VOID_SALE"] },
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const logBySaleId = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    // First one wins — orderBy desc means that's the most recent, which
    // matters if this ever stops being a one-time-only action.
    if (!logBySaleId.has(log.entityId)) {
      logBySaleId.set(log.entityId, log);
    }
  }

  const results: ReversedSaleInfo[] = [];
  for (const sale of sales) {
    const log = logBySaleId.get(sale.id);
    if (!log) continue; // defensive — shouldn't happen in practice
    const metadata = log.metadata as Record<string, unknown>;
    results.push({
      sale,
      action: log.action as "RETURN_SALE" | "VOID_SALE",
      reason: typeof metadata.reason === "string" ? metadata.reason : null,
      performedBy: log.user.name,
      reversedAt: log.createdAt,
    });
  }

  return results;
}

// ---------------------------------------------------------------------
// ProductStockMovement (phase 9 — per-product stock history)
// ---------------------------------------------------------------------

/**
 * Every stock-affecting event for a single product — creation, manual
 * edits, sales, and returns/voids (01-business-rules.md section 10).
 * Read-only; every row here is written by the functions above, in the
 * same transaction as the quantity change they record.
 */
export function listProductStockMovements(productId: string) {
  return prisma.productStockMovement.findMany({
    where: { productId },
    include: {
      user: { select: { name: true } },
      sale: { select: { id: true, description: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
