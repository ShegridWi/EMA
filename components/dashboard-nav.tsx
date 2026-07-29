import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// These routes don't exist yet — they're built in later phases (see
// .prompts/00-README.md). Only the links are wired up here.
const NAV_LINKS = [
  { href: "/inventory/materials", key: "materials" },
  { href: "/inventory/products", key: "products" },
  { href: "/sales", key: "sales" },
  { href: "/reports", key: "reports" },
  { href: "/users", key: "users" },
  { href: "/movement-log", key: "movementLog" },
] as const;

export async function DashboardNav() {
  const t = await getTranslations("Nav");

  return (
    <nav className="w-56 shrink-0 border-r border-zinc-200 p-4 dark:border-zinc-800">
      <ul className="flex flex-col gap-1">
        {NAV_LINKS.map((link) => (
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
