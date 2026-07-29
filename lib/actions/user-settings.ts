"use server";

import { auth } from "@/lib/auth";
import { updateUserSettingsSchema } from "@/lib/validations/user-settings";
import { updateUserSettings } from "@/lib/user-settings";

// Every signed-in user (any role) manages only their own settings —
// there's no "edit someone else's" case, so the target user is always
// derived from the session, never from client input (avoids even having
// to check "is this id mine").
export async function updateUserSettingsAction(input: unknown) {
  const session = await auth();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = updateUserSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const settings = await updateUserSettings(session.user.id, parsed.data);
  return { success: true as const, data: settings };
}
