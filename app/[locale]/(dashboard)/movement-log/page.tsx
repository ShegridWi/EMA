import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listMovementLogs, formatMetadata, ENTITY_TYPES } from "@/lib/movement-log";
import { listUsers } from "@/lib/users";
import { zonedTimeToUtc, formatInTimezone } from "@/lib/timezone";
import { Link } from "@/i18n/navigation";

const PAGE_SIZE = 25;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    from?: string;
    to?: string;
    entityType?: string;
    userId?: string;
  }>;
};

// Preserves the current filters across pagination links — same idea as
// the Users list's buildHref (app/[locale]/(dashboard)/users/page.tsx).
function buildHref(
  filters: { from?: string; to?: string; entityType?: string; userId?: string },
  page?: number,
) {
  const query: Record<string, string> = {};
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.userId) query.userId = filters.userId;
  if (page && page > 1) query.page = String(page);
  return { pathname: "/movement-log" as const, query };
}

export default async function MovementLogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { page: pageParam, from, to, entityType, userId } = await searchParams;
  const session = await auth();

  // Admin-only, no exceptions (03-roles-permissions.md "Movement log" row).
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}`);
  }

  const page = Math.max(1, Number(pageParam) || 1);
  // Date-only inputs (<input type="date">) interpreted as midnight in
  // *this admin's* configured timezone, not the server's local time
  // (05-nextjs-conventions.md "Timezone handling") — widen "to" to the
  // end of that day so the filter is inclusive of the whole selected
  // range.
  const timeZone = session.user.settings.timezone;
  const fromDate = from ? zonedTimeToUtc(from, timeZone) : undefined;
  const toDate = to
    ? zonedTimeToUtc(to, timeZone, {
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      })
    : undefined;
  const entityTypeFilter =
    entityType && (ENTITY_TYPES as readonly string[]).includes(entityType)
      ? entityType
      : undefined;

  const [{ logs, total, pageCount }, users] = await Promise.all([
    listMovementLogs(
      { from: fromDate, to: toDate, entityType: entityTypeFilter, userId },
      { page, pageSize: PAGE_SIZE },
    ),
    listUsers(),
  ]);

  const t = await getTranslations("MovementLog");
  const tCommon = await getTranslations("Common");
  const tAction = await getTranslations("MovementAction");
  const tEntityType = await getTranslations("EntityType");

  const filters = { from, to, entityType, userId };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-sm font-medium">
            {t("dateFrom")}
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={from ?? ""}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-sm font-medium">
            {t("dateTo")}
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="entityType" className="text-sm font-medium">
            {t("entityTypeLabel")}
          </label>
          <select
            id="entityType"
            name="entityType"
            defaultValue={entityTypeFilter ?? ""}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          >
            <option value="">{t("entityTypeAll")}</option>
            {ENTITY_TYPES.map((value) => (
              <option key={value} value={value}>
                {tEntityType(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="userId" className="text-sm font-medium">
            {t("userLabel")}
          </label>
          <select
            id="userId"
            name="userId"
            defaultValue={userId ?? ""}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          >
            <option value="">{t("userAll")}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          {tCommon("search")}
        </button>
      </form>

      {logs.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tCommon("empty")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-2">{t("tableDate")}</th>
                  <th className="p-2">{t("tableUser")}</th>
                  <th className="p-2">{t("tableAction")}</th>
                  <th className="p-2">{t("tableEntity")}</th>
                  <th className="p-2">{t("tableDetails")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="p-2 whitespace-nowrap">
                      {formatInTimezone(log.createdAt, timeZone, locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="p-2">{log.user.name}</td>
                    <td className="p-2">{tAction(log.action)}</td>
                    <td className="p-2">{tEntityType(log.entityType)}</td>
                    <td className="p-2 text-zinc-600 dark:text-zinc-400">
                      {formatMetadata(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              {t("pageIndicator", { page, pageCount, total })}
            </span>
            <div className="flex gap-3">
              {page > 1 && (
                <Link href={buildHref(filters, page - 1)} className="underline">
                  {t("previousPage")}
                </Link>
              )}
              {page < pageCount && (
                <Link href={buildHref(filters, page + 1)} className="underline">
                  {t("nextPage")}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
