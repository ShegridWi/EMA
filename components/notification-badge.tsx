import { auth } from "@/lib/auth";
import { listNotificationsForSession } from "@/lib/notifications";
import { NotificationBell } from "@/components/notification-bell";

// Server-rendered initial notification list (pending pedidos scoped to
// the viewer's city unless admin, plus — admin-only — recently
// registered sales) so the bell is correct on first paint;
// components/notification-bell.tsx keeps it fresh after that via a
// periodic client poll.
export async function NotificationBadge() {
  const session = await auth();
  if (!session) return null;

  const items = await listNotificationsForSession(session.user.role, session.user.city);

  return <NotificationBell userId={session.user.id} initialItems={items} />;
}
