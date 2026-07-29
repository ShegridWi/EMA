import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getProductById, listProductStockMovements } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { formatInTimezone } from "@/lib/timezone";
import { ArrowLeft } from "lucide-react";
import { MutedText } from "@/components/ui/muted-text";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function ProductHistoryPage({ params }: Props) {
  const { locale, id } = await params;
  const session = await auth();

  // Read-only, both roles — same visibility as viewing the product
  // itself (03-roles-permissions.md "Finished product" row).
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  const movements = await listProductStockMovements(id);

  const t = await getTranslations("ProductHistory");
  const tCommon = await getTranslations("Common");
  const tReason = await getTranslations("StockMovementReason");
  const timeZone = session.user.settings.timezone;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/inventory/products"
          className="inline-flex items-center gap-1 text-sm underline"
        >
          <ArrowLeft className="size-4" />
          {t("backToList")}
        </Link>
        <h1 className="text-xl font-semibold">
          {t("title", { description: product.description })}
        </h1>
      </div>

      {movements.length === 0 ? (
        <MutedText>{tCommon("empty")}</MutedText>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">{t("tableDate")}</th>
                <th className="p-2">{t("tableBefore")}</th>
                <th className="p-2">{t("tableAfter")}</th>
                <th className="p-2">{t("tableDelta")}</th>
                <th className="p-2">{t("tableReason")}</th>
                <th className="p-2">{t("tableSale")}</th>
                <th className="p-2">{t("tableUser")}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement.id} className="border-b border-border/50">
                  <td className="p-2 whitespace-nowrap">
                    {formatInTimezone(movement.createdAt, timeZone, locale, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="p-2">{movement.quantityBefore}</td>
                  <td className="p-2">{movement.quantityAfter}</td>
                  <td className="p-2">
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                  </td>
                  <td className="p-2">{tReason(movement.reason)}</td>
                  <td className="p-2">{movement.sale?.description ?? "—"}</td>
                  <td className="p-2">{movement.user.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
