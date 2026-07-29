import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import type { Role, City } from "@/app/generated/prisma/enums";
import type { User } from "@/app/generated/prisma/client";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/validations/user";

// This is the only file allowed to call `prisma.user.*` for mutations
// (same rule as lib/inventory.ts for Material/Product/Sale — CLAUDE.md
// section 7). Every mutation wraps the write and the MovementLog insert
// in the same `prisma.$transaction`.
//
// Soft-delete decision (User has both `active` and `deletedAt`,
// 02-data-model.md): "deactivate" sets `active = false` and never
// touches `deletedAt`. `deletedAt` is reserved for a real account
// removal, which this MVP doesn't offer — there is no UI path that sets
// it. `lib/auth.ts` already treats either `!active` or `deletedAt` as
// "cannot sign in", so this is consistent with what phase 2 assumed.

export type SerializedUser = Omit<User, "passwordHash">;

// Never send passwordHash across the Server Action boundary — listed as
// an explicit allowlist rather than a destructure-omit so it can't grow
// a new sensitive field silently if User ever gets one.
export function serializeUser(user: User): SerializedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    city: user.city,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}

export type UserFilters = {
  search?: string;
  role?: Role;
  city?: City;
  active?: boolean;
};

export function listUsers(filters: UserFilters = {}) {
  const { search, role, city, active } = filters;

  return prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(city ? { city } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export function getUserById(id: string) {
  return prisma.user.findFirst({ where: { id, deletedAt: null } });
}

export class EmailInUseError extends Error {
  constructor(public readonly email: string) {
    super(`Email already in use: ${email}`);
    this.name = "EmailInUseError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export async function createUser(input: CreateUserInput, userId: string) {
  const { password, ...rest } = input;
  const passwordHash = await hashPassword(password);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...rest, passwordHash },
      });

      await writeAuditLog(tx, {
        userId,
        action: "CREATE_USER",
        entityType: "User",
        entityId: user.id,
        // Never log passwordHash.
        metadata: rest,
      });

      return user;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EmailInUseError(input.email);
    }
    throw error;
  }
}

export async function updateUser(input: UpdateUserInput, userId: string) {
  const { id, password, ...rest } = input;
  const passwordHash = password ? await hashPassword(password) : undefined;

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { ...rest, ...(passwordHash ? { passwordHash } : {}) },
      });

      await writeAuditLog(tx, {
        userId,
        action: "UPDATE_USER",
        entityType: "User",
        entityId: user.id,
        // Never log passwordHash, and never log *whether* the password
        // changed via its value — just note that it did.
        metadata: { ...rest, passwordChanged: Boolean(password) },
      });

      return user;
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EmailInUseError(input.email);
    }
    throw error;
  }
}

export class CannotDeactivateSelfError extends Error {
  constructor() {
    super("A user cannot deactivate their own account");
    this.name = "CannotDeactivateSelfError";
  }
}

export async function deactivateUser(id: string, actingUserId: string) {
  if (id === actingUserId) {
    throw new CannotDeactivateSelfError();
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { active: false },
    });

    await writeAuditLog(tx, {
      userId: actingUserId,
      action: "DELETE_USER",
      entityType: "User",
      entityId: user.id,
      metadata: {},
    });

    return user;
  });
}

// `reason` is an optional free-text note on why the account is being
// restored, same idea as reverseSale's reason for RETURN_SALE/VOID_SALE —
// stored in the MovementLog entry's metadata, not on the User row.
export async function reactivateUser(
  id: string,
  actingUserId: string,
  reason?: string,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: { active: true },
    });

    await writeAuditLog(tx, {
      userId: actingUserId,
      action: "REACTIVATE_USER",
      entityType: "User",
      entityId: user.id,
      metadata: reason ? { reason } : {},
    });

    return user;
  });
}
