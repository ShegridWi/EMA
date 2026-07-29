import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

// Read-only — every write to MovementLog already goes through
// lib/audit.ts's writeAuditLog, called from the centralized mutation
// layers (lib/inventory.ts, lib/users.ts). This file only queries it for
// the admin-only audit view (01-business-rules.md section 6).

// entityType is a plain string column (not a Prisma enum — see
// prisma/schema.prisma), so the known values are just a fixed list here,
// matching what the centralized mutation layers actually write.
export const ENTITY_TYPES = ["Material", "Product", "Sale", "User"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export type MovementLogFilters = {
  from?: Date;
  to?: Date;
  entityType?: string;
  userId?: string;
};

export type MovementLogPagination = {
  page: number;
  pageSize: number;
};

export async function listMovementLogs(
  filters: MovementLogFilters = {},
  pagination: MovementLogPagination,
) {
  const where: Prisma.MovementLogWhereInput = {
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.userId ? { userId: filters.userId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const { page, pageSize } = pagination;

  const [logs, total] = await Promise.all([
    prisma.movementLog.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.movementLog.count({ where }),
  ]);

  return { logs, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

// A generic "key: value, key: value" summary — deliberately not a
// per-action formatter (would need one branch per MovementAction and
// grow every time a new action logs new metadata shape) but still more
// readable than a raw JSON dump, per .prompts/07-movement-log.md.
export function formatMetadata(metadata: unknown): string {
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    Array.isArray(metadata)
  ) {
    return "—";
  }

  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return "—";

  return entries
    .map(([key, value]) => {
      const rendered =
        typeof value === "object" && value !== null
          ? JSON.stringify(value)
          : String(value);
      return `${key}: ${rendered}`;
    })
    .join(", ");
}
