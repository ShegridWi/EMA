import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import type { City } from "@/app/generated/prisma/enums";
import type {
  CreateMaterialInput,
  UpdateMaterialInput,
} from "@/lib/validations/material";

// This is the only file allowed to call `prisma.material.*` (CLAUDE.md
// section 7). Every mutation wraps the write and the MovementLog insert
// in the same `prisma.$transaction`, so they commit or roll back together.

export type MaterialFilters = {
  search?: string;
  city?: City;
};

export function listMaterials(filters: MaterialFilters = {}) {
  const { search, city } = filters;

  return prisma.material.findMany({
    where: {
      deletedAt: null,
      ...(city ? { city } : {}),
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
