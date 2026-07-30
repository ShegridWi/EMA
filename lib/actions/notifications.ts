"use server";

import { auth } from "@/lib/auth";
import { listNotificationsForSession } from "@/lib/notifications";

export async function getNotificationsAction() {
  const session = await auth();
  if (!session) {
    return { success: false as const, error: "Forbidden" };
  }

  const items = await listNotificationsForSession(session.user.role, session.user.city);
  return { success: true as const, data: { items } };
}
