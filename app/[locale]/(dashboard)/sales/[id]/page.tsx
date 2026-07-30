import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getSaleDetail } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { SaleActions } from "@/components/sales/sale-actions";
import { formatCurrency } from "@/lib/currency";
import { formatInTimezone } from "@/lib/timezone";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SaleDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getSaleDetail(id);
  if (!detail) {
    notFound();
  }
  const { sale, reversal } = detail;

  const session = await auth();
  const isAdmin = session!.user.role === "ADMIN";
  // Sellers only see their own sales' detail (same scoping listSales
  // already applies to the list itself) — an admin can view any.
  if (!isAdmin && sale.sellerId !== session!.user.id) {
    notFound();
  }

  const t = await getTranslations("Sales");
  const tCity = await getTranslations("City");
  const tSize = await getTranslations("Size");
  const tSaleType = await getTranslations("SaleType");
  const tPaymentMethod = await getTranslations("PaymentMethod");
  const timeZone = session!.user.settings.timezone;
  const locale = await getLocale();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("detailTitle")}</h1>
        <Link href="/sales" className="text-sm text-muted-foreground hover:text-foreground">
          {t("backToList")}
        </Link>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("product")} value={sale.description} />
        <Field
          label={t("kindLabel")}
          value={sale.kind === "SET" ? t("kindSet") : t("kindUnit")}
        />
        <Field label={t("color")} value={sale.color} />
        <Field label={t("size")} value={tSize(sale.size)} />
        <Field label={t("quantity")} value={String(sale.quantity)} />
        <Field label={t("unitPrice")} value={formatCurrency(sale.unitPrice.toString())} />
        <Field label={t("totalPrice")} value={formatCurrency(sale.totalPrice.toString())} />
        <Field label={t("city")} value={tCity(sale.city)} />
        <Field
          label={t("saleDate")}
          value={formatInTimezone(sale.saleDate, timeZone, locale, { dateStyle: "long" })}
        />
        <Field label={t("saleType")} value={tSaleType(sale.saleType)} />
        <Field label={t("paymentMethod")} value={tPaymentMethod(sale.paymentMethod)} />
        <Field label={t("amountPaid")} value={formatCurrency(sale.amountPaid.toString())} />
        <Field label={t("balanceDue")} value={formatCurrency(sale.balanceDue.toString())} />
        {sale.deliveryDate && (
          <Field
            label={t("expectedDate")}
            value={formatInTimezone(sale.deliveryDate, timeZone, locale, { dateStyle: "long" })}
          />
        )}
        <Field label={t("seller")} value={sale.seller.name} />
        {sale.customerName && <Field label={t("customerName")} value={sale.customerName} />}
        {sale.customerPhone && <Field label={t("customerPhone")} value={sale.customerPhone} />}
        {sale.notes && (
          <div className="col-span-full flex flex-col gap-1">
            <dt className="text-sm font-medium text-muted-foreground">{t("notes")}</dt>
            <dd className="text-sm whitespace-pre-wrap">{sale.notes}</dd>
          </div>
        )}
      </dl>

      {reversal && (
        <dl className="grid grid-cols-1 gap-4 rounded-md border border-border bg-muted/40 p-4 sm:grid-cols-2">
          <Field
            label={t("actionType")}
            value={reversal.action === "RETURN_SALE" ? t("actionReturn") : t("actionVoid")}
          />
          <Field label={t("performedBy")} value={reversal.performedBy} />
          <Field
            label={t("reversedAt")}
            value={formatInTimezone(reversal.reversedAt, timeZone, locale, { dateStyle: "long" })}
          />
          <Field label={t("reason")} value={reversal.reason ?? "—"} />
        </dl>
      )}

      {isAdmin && !reversal && (
        <div>
          <SaleActions saleId={sale.id} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
