import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import {
  BarChart3,
  History,
  Inbox,
  Package,
  Settings,
  Shirt,
  ShoppingCart,
  Users,
} from "lucide-react";

// /reports and /movement-log don't exist yet — they're built in later
// phases (see .prompts/00-README.md). Only the links are wired up here.
// Both are admin-only per 03-roles-permissions.md, same as /users below.
// /pedidos is visible to both roles — a seller claims requests from
// their own city (see lib/pedidos.ts's city scoping), an admin sees all.
const NAV_LINKS = [
  { href: "/inventory/materials", key: "materials", adminOnly: false, Icon: Package },
  { href: "/inventory/products", key: "products", adminOnly: false, Icon: Shirt },
  { href: "/sales", key: "sales", adminOnly: false, Icon: ShoppingCart },
  { href: "/pedidos", key: "pedidos", adminOnly: false, Icon: Inbox },
  { href: "/reports", key: "reports", adminOnly: true, Icon: BarChart3 },
  { href: "/users", key: "users", adminOnly: true, Icon: Users },
  { href: "/movement-log", key: "movementLog", adminOnly: true, Icon: History },
  { href: "/settings", key: "settings", adminOnly: false, Icon: Settings },
] as const;

// The link list only — no <nav> wrapper/width/border styling, so the
// same server-rendered links can be reused inside two different
// containers: the static lg+ sidebar (DashboardNav below) and the
// mobile drawer (components/mobile-nav-drawer.tsx), each owning its own
// layout around this shared content.
export async function NavLinks() {
  const t = await getTranslations("Nav");
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const links = NAV_LINKS.filter((link) => !link.adminOnly || isAdmin);

  return (
    <ul className="flex flex-col gap-1">
      {links.map(({ href, key, Icon }) => (
        <li key={key}>
          <Link
            href={href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-200 ease-in-out hover:bg-muted"
          >
            <Icon className="size-5 shrink-0" />
            {t(key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Static sidebar shown at lg+ — hidden below that breakpoint in favor of
// the drawer rendered by MobileNavDrawer (components/mobile-nav-drawer.tsx),
// which wraps its own <NavLinks /> instance.
export function DashboardNav() {
  return (
    <nav className="hidden w-56 shrink-0 flex-col border-r border-border p-4 lg:flex">
      <NavLinks />
    </nav>
  );
}
