import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listSales } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";

export default async function SalesPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  // SELLER sees only their own history, ADMIN sees everyone's
  // (03-roles-permissions.md "Sales" row).
  const sales = await listSales(
    isAdmin ? {} : { sellerId: session!.user.id },
  );

  const t = await getTranslations("Sales");
  const tCommon = await getTranslations("Common");
  const tSaleType = await getTranslations("SaleType");
  const tPaymentMethod = await getTranslations("PaymentMethod");
  const tCity = await getTranslations("City");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("historyTitle")}</h1>
        <Link
          href="/sales/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {t("addNew")}
        </Link>
      </div>

      {sales.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {tCommon("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-2">{t("product")}</th>
                <th className="p-2">{t("quantity")}</th>
                <th className="p-2">{t("totalPrice")}</th>
                <th className="p-2">{t("balanceDue")}</th>
                <th className="p-2">{t("saleType")}</th>
                <th className="p-2">{t("paymentMethod")}</th>
                <th className="p-2">{t("city")}</th>
                {isAdmin && <th className="p-2">{t("seller")}</th>}
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="p-2">{sale.description}</td>
                  <td className="p-2">{sale.quantity}</td>
                  <td className="p-2">{sale.totalPrice.toString()}</td>
                  <td className="p-2">{sale.balanceDue.toString()}</td>
                  <td className="p-2">{tSaleType(sale.saleType)}</td>
                  <td className="p-2">{tPaymentMethod(sale.paymentMethod)}</td>
                  <td className="p-2">{tCity(sale.city)}</td>
                  {isAdmin && <td className="p-2">{sale.seller.name}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
