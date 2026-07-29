import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listSales, listReversedSales } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { SaleActions } from "@/components/sales/sale-actions";
import { formatCurrency } from "@/lib/currency";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SalesPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const isCancelledTab = tab === "cancelled";

  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  // SELLER sees only their own history (active or cancelled), ADMIN sees
  // everyone's (03-roles-permissions.md "Sales" row).
  const sellerFilter = isAdmin ? {} : { sellerId: session!.user.id };

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

      <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href="/sales"
          className={`border-b-2 px-1 pb-2 text-sm font-medium ${
            isCancelledTab
              ? "border-transparent text-zinc-500 dark:text-zinc-400"
              : "border-zinc-900 dark:border-zinc-50"
          }`}
        >
          {t("tabActive")}
        </Link>
        <Link
          href="/sales?tab=cancelled"
          className={`border-b-2 px-1 pb-2 text-sm font-medium ${
            isCancelledTab
              ? "border-zinc-900 dark:border-zinc-50"
              : "border-transparent text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {t("tabCancelled")}
        </Link>
      </div>

      {isCancelledTab ? (
        <CancelledSalesTable
          sellerFilter={sellerFilter}
          t={t}
          tCommon={tCommon}
          tCity={tCity}
          isAdmin={isAdmin}
          locale={await getLocale()}
        />
      ) : (
        <ActiveSalesTable
          sellerFilter={sellerFilter}
          t={t}
          tCommon={tCommon}
          tSaleType={tSaleType}
          tPaymentMethod={tPaymentMethod}
          tCity={tCity}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

type TFn = Awaited<ReturnType<typeof getTranslations>>;

async function ActiveSalesTable({
  sellerFilter,
  t,
  tCommon,
  tSaleType,
  tPaymentMethod,
  tCity,
  isAdmin,
}: {
  sellerFilter: { sellerId?: string };
  t: TFn;
  tCommon: TFn;
  tSaleType: TFn;
  tPaymentMethod: TFn;
  tCity: TFn;
  isAdmin: boolean;
}) {
  const sales = await listSales(sellerFilter);

  if (sales.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {tCommon("empty")}
      </p>
    );
  }

  return (
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
            {isAdmin && <th className="p-2">{tCommon("actions")}</th>}
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
              <td className="p-2">
                {formatCurrency(sale.totalPrice.toString())}
              </td>
              <td className="p-2">
                {formatCurrency(sale.balanceDue.toString())}
              </td>
              <td className="p-2">{tSaleType(sale.saleType)}</td>
              <td className="p-2">{tPaymentMethod(sale.paymentMethod)}</td>
              <td className="p-2">{tCity(sale.city)}</td>
              {isAdmin && <td className="p-2">{sale.seller.name}</td>}
              {isAdmin && (
                <td className="p-2">
                  <SaleActions saleId={sale.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function CancelledSalesTable({
  sellerFilter,
  t,
  tCommon,
  tCity,
  isAdmin,
  locale,
}: {
  sellerFilter: { sellerId?: string };
  t: TFn;
  tCommon: TFn;
  tCity: TFn;
  isAdmin: boolean;
  locale: string;
}) {
  const reversedSales = await listReversedSales(sellerFilter);

  if (reversedSales.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {tCommon("empty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="p-2">{t("product")}</th>
            <th className="p-2">{t("quantity")}</th>
            <th className="p-2">{t("totalPrice")}</th>
            <th className="p-2">{t("city")}</th>
            <th className="p-2">{t("actionType")}</th>
            <th className="p-2">{t("reason")}</th>
            <th className="p-2">{t("performedBy")}</th>
            <th className="p-2">{t("reversedAt")}</th>
            {isAdmin && <th className="p-2">{t("seller")}</th>}
          </tr>
        </thead>
        <tbody>
          {reversedSales.map(({ sale, action, reason, performedBy, reversedAt }) => (
            <tr
              key={sale.id}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="p-2">{sale.description}</td>
              <td className="p-2">{sale.quantity}</td>
              <td className="p-2">
                {formatCurrency(sale.totalPrice.toString())}
              </td>
              <td className="p-2">{tCity(sale.city)}</td>
              <td className="p-2">
                {action === "RETURN_SALE"
                  ? t("actionReturn")
                  : t("actionVoid")}
              </td>
              <td className="p-2">{reason ?? "—"}</td>
              <td className="p-2">{performedBy}</td>
              <td className="p-2">
                {new Intl.DateTimeFormat(locale).format(reversedAt)}
              </td>
              {isAdmin && <td className="p-2">{sale.seller.name}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
