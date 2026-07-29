import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import type { Theme, Locale } from "@/app/generated/prisma/enums";
import type { UserSettings } from "@/app/generated/prisma/client";

// This is the only file allowed to call `prisma.userSettings.*` (same
// rule as lib/inventory.ts / lib/users.ts — CLAUDE.md section 7).
//
// The business only operates in Bolivia (fixed UTC-4, no DST), so this
// is the default almost everyone will keep — but it's a per-user
// setting, not a hardcoded constant (05-nextjs-conventions.md
// "Timezone handling").
export const DEFAULT_TIMEZONE = "America/La_Paz";

// No admin-edits-someone-else's-settings case exists
// (03-roles-permissions.md), so every read/write here is scoped to a
// single userId — there's no separate "filters" concept like the other
// list* functions in this codebase.

// Created on demand with schema defaults the first time it's read,
// rather than requiring a data migration to backfill existing users
// (02-data-model.md "UserSettings"). Safe to call on every request that
// needs it — `upsert` is a no-op when the row already exists.
export function getOrCreateUserSettings(userId: string): Promise<UserSettings> {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export type UpdateUserSettingsInput = {
  timezone: string;
  theme: Theme;
  locale: Locale;
};

export async function updateUserSettings(
  userId: string,
  input: UpdateUserSettingsInput,
): Promise<UserSettings> {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.userSettings.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });

    await writeAuditLog(tx, {
      userId,
      action: "UPDATE_SETTINGS",
      entityType: "User",
      entityId: userId,
      metadata: input,
    });

    return settings;
  });
}
