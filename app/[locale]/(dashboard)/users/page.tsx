import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { Link } from "@/i18n/navigation";
import { Role, City } from "@/app/generated/prisma/enums";
import { DeactivateUserButton } from "@/components/users/deactivate-user-button";
import { ReactivateUserButton } from "@/components/users/reactivate-user-button";
import { Pencil } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { IconButtonLink } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MutedText } from "@/components/ui/muted-text";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    tab?: string;
    q?: string;
    role?: string;
    city?: string;
  }>;
};

// Preserves the current filters (q/role/city) across tab links and the
// current tab across the filter form submit — same idea as sales/page.tsx's
// active/cancelled tabs, extended with the filter querystring.
function buildHref(
  filters: { q?: string; role?: string; city?: string },
  tab?: "inactive",
) {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.role) query.role = filters.role;
  if (filters.city) query.city = filters.city;
  if (tab) query.tab = tab;
  return { pathname: "/users" as const, query };
}

export default async function UsersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tab, q, role, city } = await searchParams;
  const session = await auth();

  // Users management has no "view" row for SELLER in
  // 03-roles-permissions.md — it's admin-only end to end, unlike
  // Materials/Products where sellers can at least view. Direct visits
  // must still be blocked server-side (CLAUDE.md section 7).
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}`);
  }

  const isInactiveTab = tab === "inactive";
  const roleFilter = role === "ADMIN" || role === "SELLER" ? role : undefined;
  const cityFilter =
    city === "LA_PAZ" || city === "SANTA_CRUZ" ? city : undefined;

  const users = await listUsers({
    search: q,
    role: roleFilter,
    city: cityFilter,
    active: !isInactiveTab,
  });

  const t = await getTranslations("Users");
  const tCommon = await getTranslations("Common");
  const tRole = await getTranslations("Role");
  const tCity = await getTranslations("City");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <ButtonLink href="/users/new">{t("addNew")}</ButtonLink>
      </div>

      <div className="flex gap-4 border-b border-border">
        <Link
          href={buildHref({ q, role, city })}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isInactiveTab
              ? "border-transparent text-muted-foreground hover:text-foreground"
              : "border-primary"
          }`}
        >
          {t("tabActive")}
        </Link>
        <Link
          href={buildHref({ q, role, city }, "inactive")}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isInactiveTab
              ? "border-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabInactive")}
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        {isInactiveTab && <input type="hidden" name="tab" value="inactive" />}
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm"
        />
        <Select
          name="role"
          defaultValue={roleFilter ?? ""}
          fullWidth={false}
        >
          <option value="">{t("roleAll")}</option>
          {Object.values(Role).map((value) => (
            <option key={value} value={value}>
              {tRole(value)}
            </option>
          ))}
        </Select>
        <Select
          name="city"
          defaultValue={cityFilter ?? ""}
          fullWidth={false}
        >
          <option value="">{t("cityAll")}</option>
          {Object.values(City).map((value) => (
            <option key={value} value={value}>
              {tCity(value)}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          {tCommon("search")}
        </Button>
      </form>

      {users.length === 0 ? (
        <MutedText>{tCommon("empty")}</MutedText>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">{t("name")}</th>
                <th className="p-2">{t("email")}</th>
                <th className="p-2">{t("role")}</th>
                <th className="p-2">{t("city")}</th>
                <th className="p-2">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/50">
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{tRole(user.role)}</td>
                  <td className="p-2">{tCity(user.city)}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <IconButtonLink
                        href={`/users/${user.id}/edit`}
                        icon={<Pencil className="size-5" />}
                        label={tCommon("edit")}
                      />
                      {user.active ? (
                        <DeactivateUserButton
                          id={user.id}
                          disabled={user.id === session.user.id}
                        />
                      ) : (
                        <ReactivateUserButton id={user.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
