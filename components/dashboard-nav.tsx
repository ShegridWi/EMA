import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";

// /reports and /movement-log don't exist yet — they're built in later
// phases (see .prompts/00-README.md). Only the links are wired up here.
// Both are admin-only per 03-roles-permissions.md, same as /users below.
const NAV_LINKS = [
  { href: "/inventory/materials", key: "materials", adminOnly: false },
  { href: "/inventory/products", key: "products", adminOnly: false },
  { href: "/sales", key: "sales", adminOnly: false },
  { href: "/reports", key: "reports", adminOnly: true },
  { href: "/users", key: "users", adminOnly: true },
  { href: "/movement-log", key: "movementLog", adminOnly: true },
] as const;

export async function DashboardNav() {
  const t = await getTranslations("Nav");
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const links = NAV_LINKS.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-200 p-4 dark:border-zinc-800">
      <ul className="flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.key}>
            <Link
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              {t(link.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
