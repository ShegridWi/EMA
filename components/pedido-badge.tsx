import { auth } from "@/lib/auth";
import { listPedidoNotifications } from "@/lib/pedidos";
import { PedidoNotifications } from "@/components/pedido-notifications";

// Server-rendered initial notification list (scoped to the viewer's city
// unless admin, same rule as the /pedidos list) so the dropdown is
// correct on first paint; components/pedido-notifications.tsx keeps it
// fresh after that via a periodic client poll.
export async function PedidoBadge() {
  const session = await auth();
  if (!session) return null;

  const isAdmin = session.user.role === "ADMIN";
  const items = await listPedidoNotifications(isAdmin ? undefined : session.user.city);

  return <PedidoNotifications userId={session.user.id} initialItems={items} />;
}
