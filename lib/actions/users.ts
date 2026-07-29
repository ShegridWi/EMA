"use server";

import { auth } from "@/lib/auth";
import {
  createUserSchema,
  updateUserSchema,
  deactivateUserSchema,
  reactivateUserSchema,
} from "@/lib/validations/user";
import {
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  serializeUser,
  EmailInUseError,
  CannotDeactivateSelfError,
} from "@/lib/users";

// Users management is 100% admin-only (03-roles-permissions.md "Users"
// row) — every action here rejects non-ADMIN sessions server-side, with
// no UI-only gating.

export async function createUserAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const user = await createUser(parsed.data, session.user.id);
    return { success: true as const, data: serializeUser(user) };
  } catch (error) {
    if (error instanceof EmailInUseError) {
      return { success: false as const, error: "email_in_use" };
    }
    throw error;
  }
}

export async function updateUserAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const user = await updateUser(parsed.data, session.user.id);
    return { success: true as const, data: serializeUser(user) };
  } catch (error) {
    if (error instanceof EmailInUseError) {
      return { success: false as const, error: "email_in_use" };
    }
    throw error;
  }
}

export async function deactivateUserAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = deactivateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  try {
    const user = await deactivateUser(parsed.data.id, session.user.id);
    return { success: true as const, data: serializeUser(user) };
  } catch (error) {
    if (error instanceof CannotDeactivateSelfError) {
      return { success: false as const, error: "cannot_deactivate_self" };
    }
    throw error;
  }
}

export async function reactivateUserAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = reactivateUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const user = await reactivateUser(
    parsed.data.id,
    session.user.id,
    parsed.data.reason,
  );
  return { success: true as const, data: serializeUser(user) };
}
