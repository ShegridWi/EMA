import { getTranslations } from "next-intl/server";
import { listPedidoNotifications } from "@/lib/pedidos";
import { listRecentSaleNotifications } from "@/lib/inventory";
import { formatCurrency } from "@/lib/currency";
import type { City, Role } from "@/app/generated/prisma/enums";

// The dashboard header's notification bell (components/notification-bell.tsx)
// shows two kinds of items in one combined, chronologically-sorted list:
// pending pedido/cotización requests (visible to sellers for their own
// city, all cities for admins — see lib/pedidos.ts) and newly-registered
// sales (admin-only, for oversight of every seller's activity — the
// business explicitly asked for admin-only visibility here, unlike
// pedidos which sellers act on directly).
//
// Each item's display text is built here, server-side, with
// `getTranslations` — the client component never needs to know about
// `RequestKind`/`City` enums or re-translate anything, it just renders
// plain strings. This keeps the bell itself fully generic.
export type NotificationItem = {
  id: string;
  kind: "pedido" | "sale";
  href: string;
  title: string;
  subtitle: string;
  createdAt: Date;
};

export async function listNotificationsForSession(
  role: Role,
  city: City,
): Promise<NotificationItem[]> {
  const isAdmin = role === "ADMIN";

  const [tRequestKind, tCity] = await Promise.all([
    getTranslations("RequestKind"),
    getTranslations("City"),
  ]);

  const pedidoItems = await listPedidoNotifications(isAdmin ? undefined : city);
  const pedidoNotifications: NotificationItem[] = pedidoItems.map((item) => ({
    id: `pedido:${item.id}`,
    kind: "pedido",
    href: `/pedidos/${item.id}`,
    title: item.customerName,
    subtitle: `${tRequestKind(item.kind)} · ${tCity(item.city)}`,
    createdAt: item.createdAt,
  }));

  let saleNotifications: NotificationItem[] = [];
  if (isAdmin) {
    const saleItems = await listRecentSaleNotifications();
    saleNotifications = saleItems.map((sale) => ({
      id: `sale:${sale.id}`,
      kind: "sale",
      href: `/sales/${sale.id}`,
      title: sale.description,
      subtitle: `${sale.sellerName} · ${tCity(sale.city)} · ${formatCurrency(sale.totalPrice)}`,
      createdAt: sale.createdAt,
    }));
  }

  return [...pedidoNotifications, ...saleNotifications].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );
}
