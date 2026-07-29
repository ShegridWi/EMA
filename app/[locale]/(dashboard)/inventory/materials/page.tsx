import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listMaterials } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { DeleteMaterialButton } from "@/components/materials/delete-material-button";
import { formatCurrency } from "@/lib/currency";
import { zonedTimeToUtc } from "@/lib/timezone";

type Props = {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
};

export default async function MaterialsPage({ searchParams }: Props) {
  const { q, from, to } = await searchParams;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

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

  const materials = await listMaterials({ search: q, createdFrom, createdTo });

  const t = await getTranslations("Materials");
  const tCommon = await getTranslations("Common");
  const tUnit = await getTranslations("Unit");
  const tCity = await getTranslations("City");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {isAdmin && (
          <Link
            href="/inventory/materials/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {t("addNew")}
          </Link>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
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

      {materials.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tCommon("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-2">{t("materialType")}</th>
                <th className="p-2">{t("type")}</th>
                <th className="p-2">{t("color")}</th>
                <th className="p-2">{t("quantity")}</th>
                <th className="p-2">{t("unit")}</th>
                <th className="p-2">{t("city")}</th>
                <th className="p-2">{t("purchasePrice")}</th>
                {isAdmin && <th className="p-2">{tCommon("actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr
                  key={material.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="p-2">{material.materialType}</td>
                  <td className="p-2">{material.type}</td>
                  <td className="p-2">{material.color ?? "—"}</td>
                  <td className="p-2">{material.quantity.toString()}</td>
                  <td className="p-2">{tUnit(material.unit)}</td>
                  <td className="p-2">{tCity(material.city)}</td>
                  <td className="p-2">
                    {formatCurrency(material.purchasePrice.toString())}
                  </td>
                  {isAdmin && (
                    <td className="p-2">
                      <div className="flex gap-3">
                        <Link
                          href={`/inventory/materials/${material.id}/edit`}
                          className="underline"
                        >
                          {tCommon("edit")}
                        </Link>
                        <DeleteMaterialButton id={material.id} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
