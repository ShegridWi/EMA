import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import {
  BarChart3,
  History,
  Package,
  Settings,
  Shirt,
  ShoppingCart,
  Users,
} from "lucide-react";

// /reports and /movement-log don't exist yet — they're built in later
// phases (see .prompts/00-README.md). Only the links are wired up here.
// Both are admin-only per 03-roles-permissions.md, same as /users below.
const NAV_LINKS = [
  { href: "/inventory/materials", key: "materials", adminOnly: false, Icon: Package },
  { href: "/inventory/products", key: "products", adminOnly: false, Icon: Shirt },
  { href: "/sales", key: "sales", adminOnly: false, Icon: ShoppingCart },
  { href: "/reports", key: "reports", adminOnly: true, Icon: BarChart3 },
  { href: "/users", key: "users", adminOnly: true, Icon: Users },
  { href: "/movement-log", key: "movementLog", adminOnly: true, Icon: History },
  { href: "/settings", key: "settings", adminOnly: false, Icon: Settings },
] as const;

export async function DashboardNav() {
  const t = await getTranslations("Nav");
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const links = NAV_LINKS.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-200 p-4 dark:border-zinc-800">
      <ul className="flex flex-col gap-1">
        {links.map(({ href, key, Icon }) => (
          <li key={key}>
            <Link
              href={href}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <Icon className="size-5 shrink-0" />
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
