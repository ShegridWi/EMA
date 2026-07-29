import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listSales, listReversedSales, type SaleFilters } from "@/lib/inventory";
import { listUsers } from "@/lib/users";
import { Link } from "@/i18n/navigation";
import { SaleActions } from "@/components/sales/sale-actions";
import { formatCurrency } from "@/lib/currency";
import { zonedTimeToUtc, formatInTimezone } from "@/lib/timezone";
import { City, SaleType } from "@/app/generated/prisma/enums";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { MutedText } from "@/components/ui/muted-text";

type Props = {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    city?: string;
    saleType?: string;
    sellerId?: string;
    from?: string;
    to?: string;
  }>;
};

// Preserves the current filters across the tab links and the current
// tab across the filter form submit — same idea as the Users/Products
// lists' buildHref.
function buildHref(
  filters: {
    q?: string;
    city?: string;
    saleType?: string;
    sellerId?: string;
    from?: string;
    to?: string;
  },
  tab?: "cancelled",
) {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.city) query.city = filters.city;
  if (filters.saleType) query.saleType = filters.saleType;
  if (filters.sellerId) query.sellerId = filters.sellerId;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  if (tab) query.tab = tab;
  return { pathname: "/sales" as const, query };
}

export default async function SalesPage({ searchParams }: Props) {
  const { tab, q, city, saleType, sellerId, from, to } = await searchParams;
  const isCancelledTab = tab === "cancelled";

  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const cityFilter = city && (Object.values(City) as string[]).includes(city)
    ? (city as City)
    : undefined;
  const saleTypeFilter =
    saleType && (Object.values(SaleType) as string[]).includes(saleType)
      ? (saleType as SaleType)
      : undefined;

  // Date-only inputs interpreted as midnight in *this user's* configured
  // timezone, not the server's local time (05-nextjs-conventions.md
  // "Timezone handling").
  const timeZone = session!.user.settings.timezone;
  const dateFrom = from ? zonedTimeToUtc(from, timeZone) : undefined;
  const dateTo = to
    ? zonedTimeToUtc(to, timeZone, {
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      })
    : undefined;

  // SELLER sees only their own history (active or cancelled), never
  // overridable; ADMIN sees everyone's by default and can optionally
  // narrow to one seller (03-roles-permissions.md "Sales" row).
  const filters: SaleFilters = {
    sellerId: isAdmin ? sellerId : session!.user.id,
    search: q,
    city: cityFilter,
    saleType: saleTypeFilter,
    dateFrom,
    dateTo,
  };

  const t = await getTranslations("Sales");
  const tCommon = await getTranslations("Common");
  const tSaleType = await getTranslations("SaleType");
  const tPaymentMethod = await getTranslations("PaymentMethod");
  const tCity = await getTranslations("City");

  const sellers = isAdmin ? await listUsers() : [];
  const filterHrefState = { q, city, saleType, sellerId, from, to };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">{t("historyTitle")}</h1>
        <ButtonLink href="/sales/new">{t("addNew")}</ButtonLink>
      </div>

      <div className="flex gap-4 border-b border-border">
        <Link
          href={buildHref(filterHrefState)}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isCancelledTab
              ? "border-transparent text-muted-foreground hover:text-foreground"
              : "border-primary"
          }`}
        >
          {t("tabActive")}
        </Link>
        <Link
          href={buildHref(filterHrefState, "cancelled")}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isCancelledTab
              ? "border-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabCancelled")}
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        {isCancelledTab && <input type="hidden" name="tab" value="cancelled" />}
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm"
        />
        <FormField label={t("city")} htmlFor="city">
          <Select id="city" name="city" defaultValue={cityFilter ?? ""}>
            <option value="">{t("cityAll")}</option>
            {Object.values(City).map((value) => (
              <option key={value} value={value}>
                {tCity(value)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t("saleType")} htmlFor="saleType">
          <Select
            id="saleType"
            name="saleType"
            defaultValue={saleTypeFilter ?? ""}
          >
            <option value="">{t("saleTypeAll")}</option>
            {Object.values(SaleType).map((value) => (
              <option key={value} value={value}>
                {tSaleType(value)}
              </option>
            ))}
          </Select>
        </FormField>
        {isAdmin && (
          <FormField label={t("seller")} htmlFor="sellerId">
            <Select id="sellerId" name="sellerId" defaultValue={sellerId ?? ""}>
              <option value="">{t("sellerAll")}</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label={t("dateFrom")} htmlFor="from">
          <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
        </FormField>
        <FormField label={t("dateTo")} htmlFor="to">
          <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
        </FormField>
        <Button type="submit" variant="secondary">
          {tCommon("search")}
        </Button>
      </form>

      {isCancelledTab ? (
        <CancelledSalesTable
          filters={filters}
          t={t}
          tCommon={tCommon}
          tCity={tCity}
          isAdmin={isAdmin}
          locale={await getLocale()}
          timeZone={timeZone}
        />
      ) : (
        <ActiveSalesTable
          filters={filters}
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
  filters,
  t,
  tCommon,
  tSaleType,
  tPaymentMethod,
  tCity,
  isAdmin,
}: {
  filters: SaleFilters;
  t: TFn;
  tCommon: TFn;
  tSaleType: TFn;
  tPaymentMethod: TFn;
  tCity: TFn;
  isAdmin: boolean;
}) {
  const sales = await listSales(filters);

  if (sales.length === 0) {
    return <MutedText>{tCommon("empty")}</MutedText>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-border">
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
            <tr key={sale.id} className="border-b border-border/50">
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
  filters,
  t,
  tCommon,
  tCity,
  isAdmin,
  locale,
  timeZone,
}: {
  filters: SaleFilters;
  t: TFn;
  tCommon: TFn;
  tCity: TFn;
  isAdmin: boolean;
  locale: string;
  timeZone: string;
}) {
  const reversedSales = await listReversedSales(filters);

  if (reversedSales.length === 0) {
    return <MutedText>{tCommon("empty")}</MutedText>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-border">
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
            <tr key={sale.id} className="border-b border-border/50">
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
                {formatInTimezone(reversedAt, timeZone, locale)}
              </td>
              {isAdmin && <td className="p-2">{sale.seller.name}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
