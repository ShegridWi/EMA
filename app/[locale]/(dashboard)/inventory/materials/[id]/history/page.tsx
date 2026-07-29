import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getMaterialById, listMaterialStockMovements } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { formatInTimezone } from "@/lib/timezone";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function MaterialHistoryPage({ params }: Props) {
  const { locale, id } = await params;
  const session = await auth();

  // Read-only, both roles — same visibility as viewing the material
  // itself (03-roles-permissions.md "Inventory — Manufacturing" row).
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const material = await getMaterialById(id);
  if (!material) {
    notFound();
  }

  const movements = await listMaterialStockMovements(id);

  const t = await getTranslations("MaterialHistory");
  const tCommon = await getTranslations("Common");
  const tReason = await getTranslations("StockMovementReason");
  const timeZone = session.user.settings.timezone;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/inventory/materials" className="text-sm underline">
          {t("backToList")}
        </Link>
        <h1 className="text-xl font-semibold">
          {t("title", { description: material.materialType })}
        </h1>
      </div>

      {movements.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tCommon("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-2">{t("tableDate")}</th>
                <th className="p-2">{t("tableBefore")}</th>
                <th className="p-2">{t("tableAfter")}</th>
                <th className="p-2">{t("tableDelta")}</th>
                <th className="p-2">{t("tableReason")}</th>
                <th className="p-2">{t("tableUser")}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const delta = movement.delta.toString();
                return (
                  <tr
                    key={movement.id}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="p-2 whitespace-nowrap">
                      {formatInTimezone(movement.createdAt, timeZone, locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="p-2">{movement.quantityBefore.toString()}</td>
                    <td className="p-2">{movement.quantityAfter.toString()}</td>
                    <td className="p-2">
                      {movement.delta.isPositive() ? `+${delta}` : delta}
                    </td>
                    <td className="p-2">{tReason(movement.reason)}</td>
                    <td className="p-2">{movement.user.name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
