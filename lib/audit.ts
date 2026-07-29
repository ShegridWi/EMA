import type { Prisma } from "@/app/generated/prisma/client";
import type { MovementAction } from "@/app/generated/prisma/enums";

export type AuditLogEntry = {
  userId: string;
  action: MovementAction;
  entityType: string;
  entityId: string;
  metadata: Prisma.InputJsonValue;
};

/**
 * Writes a MovementLog row using an already-open transaction client.
 * Never opens its own transaction — callers in lib/inventory.ts (and
 * similar centralized mutation layers) pass the `tx` from their own
 * `prisma.$transaction`, so the log insert and the data write commit or
 * roll back together.
 */
export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  entry: AuditLogEntry,
) {
  await tx.movementLog.create({ data: entry });
}
