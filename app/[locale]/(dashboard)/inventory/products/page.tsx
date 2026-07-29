import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listProducts } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { DeleteProductButton } from "@/components/products/delete-product-button";
import { DeactivateProductButton } from "@/components/products/deactivate-product-button";
import { ReactivateProductButton } from "@/components/products/reactivate-product-button";
import { formatCurrency } from "@/lib/currency";
import { zonedTimeToUtc } from "@/lib/timezone";
import { Size } from "@/app/generated/prisma/enums";
import type { Product } from "@/app/generated/prisma/client";

type Props = {
  searchParams: Promise<{
    q?: string;
    size?: string;
    from?: string;
    to?: string;
    tab?: string;
  }>;
};

// Preserves the current filters across the tab links and the current
// tab across the filter form submit — same idea as the Users list's
// buildHref (app/[locale]/(dashboard)/users/page.tsx).
function buildHref(
  filters: { q?: string; size?: string; from?: string; to?: string },
  tab?: "inactive",
) {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.size) query.size = filters.size;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  if (tab) query.tab = tab;
  return { pathname: "/inventory/products" as const, query };
}

export default async function ProductsPage({ searchParams }: Props) {
  const { q, size, from, to, tab } = await searchParams;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const isInactiveTab = tab === "inactive";

  const sizeFilter = size && (Object.values(Size) as string[]).includes(size)
    ? (size as Size)
    : undefined;

  // Date-only inputs interpreted as midnight in *this user's* configured
  // timezone, not the server's local time (05-nextjs-conventions.md
  // "Timezone handling").
  const timeZone = session!.user.settings.timezone;
  const createdFrom = from ? zonedTimeToUtc(from, timeZone) : undefined;
  const createdTo = to
    ? zonedTimeToUtc(to, timeZone, {
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      })
    : undefined;

  const products = await listProducts({
    search: q,
    size: sizeFilter,
    createdFrom,
    createdTo,
    active: !isInactiveTab,
  });

  const sets = products.filter((p) => p.kind === "SET");
  const setIds = new Set(sets.map((s) => s.id));
  const pieces = products.filter(
    (p) => p.kind === "UNIT" && p.setId && setIds.has(p.setId),
  );
  // Standalone units, plus pieces whose parent SET didn't match the
  // current search filter — they still need to show up somewhere.
  const standalone = products.filter(
    (p) => p.kind === "UNIT" && !(p.setId && setIds.has(p.setId)),
  );

  const piecesBySetId = new Map<string, Product[]>();
  for (const piece of pieces) {
    const list = piecesBySetId.get(piece.setId!) ?? [];
    list.push(piece);
    piecesBySetId.set(piece.setId!, list);
  }

  const t = await getTranslations("Products");
  const tCommon = await getTranslations("Common");
  const tSize = await getTranslations("Size");
  const tCity = await getTranslations("City");
  const tPieceRole = await getTranslations("PieceRole");
  const tHistory = await getTranslations("ProductHistory");

  const isEmpty = sets.length === 0 && standalone.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Link
              href="/inventory/products/new-set"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {t("addNewSet")}
            </Link>
            <Link
              href="/inventory/products/new"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
            >
              {t("addNewUnit")}
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href={buildHref({ q, size, from, to })}
          className={`border-b-2 px-1 pb-2 text-sm font-medium ${
            isInactiveTab
              ? "border-transparent text-zinc-500 dark:text-zinc-400"
              : "border-zinc-900 dark:border-zinc-50"
          }`}
        >
          {t("tabActive")}
        </Link>
        <Link
          href={buildHref({ q, size, from, to }, "inactive")}
          className={`border-b-2 px-1 pb-2 text-sm font-medium ${
            isInactiveTab
              ? "border-zinc-900 dark:border-zinc-50"
              : "border-transparent text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {t("tabInactive")}
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        {isInactiveTab && <input type="hidden" name="tab" value="inactive" />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="size" className="text-sm font-medium">
            {t("size")}
          </label>
          <select
            id="size"
            name="size"
            defaultValue={sizeFilter ?? ""}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          >
            <option value="">{t("sizeAll")}</option>
            {Object.values(Size).map((value) => (
              <option key={value} value={value}>
                {tSize(value)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-sm font-medium">
            {t("createdFrom")}
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
            {t("createdTo")}
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={to ?? ""}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          {tCommon("search")}
        </button>
      </form>

      {isEmpty ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tCommon("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {sets.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                {t("setsSectionTitle")}
              </h2>
              {sets.map((set) => (
                <div
                  key={set.id}
                  className="rounded-md border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="font-medium">{set.description}</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {set.color} · {tSize(set.size)} · {tCity(set.city)} ·{" "}
                        {formatCurrency(set.price.toString())}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href={`/inventory/products/${set.id}/history`}
                        className="text-sm underline"
                      >
                        {tHistory("linkLabel")}
                      </Link>
                      {isAdmin && (
                        <>
                          <Link
                            href={`/inventory/products/${set.id}/edit`}
                            className="text-sm underline"
                          >
                            {tCommon("edit")}
                          </Link>
                          {set.active ? (
                            <DeactivateProductButton id={set.id} />
                          ) : (
                            <ReactivateProductButton id={set.id} />
                          )}
                          <DeleteProductButton id={set.id} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                          <th className="p-2">{t("kindUnit")}</th>
                          <th className="p-2">{t("quantity")}</th>
                          <th className="p-2">{t("price")}</th>
                          <th className="p-2">{tCommon("actions")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(piecesBySetId.get(set.id) ?? []).map((piece) => (
                          <tr
                            key={piece.id}
                            className="border-b border-zinc-100 dark:border-zinc-900"
                          >
                            <td className="p-2">
                              {piece.pieceRole ? tPieceRole(piece.pieceRole) : "—"}
                            </td>
                            <td className="p-2">{piece.quantity}</td>
                            <td className="p-2">
                              {formatCurrency(piece.price.toString())}
                            </td>
                            <td className="p-2">
                                <div className="flex gap-3">
                                  <Link
                                    href={`/inventory/products/${piece.id}/history`}
                                    className="underline"
                                  >
                                    {tHistory("linkLabel")}
                                  </Link>
                                  {isAdmin && (
                                    <>
                                  <Link
                                    href={`/inventory/products/${piece.id}/edit`}
                                    className="underline"
                                  >
                                    {tCommon("edit")}
                                  </Link>
                                  {piece.active ? (
                                    <DeactivateProductButton id={piece.id} />
                                  ) : (
                                    <ReactivateProductButton id={piece.id} />
                                  )}
                                  <DeleteProductButton id={piece.id} />
                                  </>
                                  )}
                                </div>
                              </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </section>
          )}

          {standalone.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold uppercase text-zinc-500 dark:text-zinc-400">
                {t("standaloneSectionTitle")}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-2">{t("description")}</th>
                      <th className="p-2">{t("color")}</th>
                      <th className="p-2">{t("size")}</th>
                      <th className="p-2">{t("quantity")}</th>
                      <th className="p-2">{t("price")}</th>
                      <th className="p-2">{t("city")}</th>
                      <th className="p-2">{tCommon("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standalone.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-zinc-100 dark:border-zinc-900"
                      >
                        <td className="p-2">{product.description}</td>
                        <td className="p-2">{product.color}</td>
                        <td className="p-2">{tSize(product.size)}</td>
                        <td className="p-2">{product.quantity}</td>
                        <td className="p-2">
                          {formatCurrency(product.price.toString())}
                        </td>
                        <td className="p-2">{tCity(product.city)}</td>
                        <td className="p-2">
                          <div className="flex gap-3">
                            <Link
                              href={`/inventory/products/${product.id}/history`}
                              className="underline"
                            >
                              {tHistory("linkLabel")}
                            </Link>
                            {isAdmin && (
                              <>
                                <Link
                                  href={`/inventory/products/${product.id}/edit`}
                                  className="underline"
                                >
                                  {tCommon("edit")}
                                </Link>
                                {product.active ? (
                                  <DeactivateProductButton id={product.id} />
                                ) : (
                                  <ReactivateProductButton id={product.id} />
                                )}
                                <DeleteProductButton id={product.id} />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
