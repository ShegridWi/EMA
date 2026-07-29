import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { roundCurrency } from "@/lib/inventory";
import { renderReportPdf } from "@/components/reports/report-document";
import { DEFAULT_TIMEZONE } from "@/lib/user-settings";
import { zonedTimeToUtc, getZonedDateOnly } from "@/lib/timezone";
import type { Sale, Material, Product } from "@/app/generated/prisma/client";

// Read-only reporting layer, shared by the manual report
// (app/api/reports/route.ts) and the automatic weekly one
// (app/api/cron/weekly-report/route.ts) so the data query and PDF
// rendering aren't duplicated between the two (.prompts/08-reports.md).

export type ReportRange = { from: Date; to: Date };

// The automatic weekly report runs every Saturday and covers that same
// business week — Monday 00:00 through Saturday 23:59:59.999, *in the
// business's own timezone* (05-nextjs-conventions.md "Timezone
// handling") — not the server's. A reference instant that falls on a
// Sunday in that timezone is treated as still belonging to the
// *previous* week (there's no real-world case where the cron fires on
// a Sunday, but the function stays sane for any input).
//
// `reference.getDay()`/`getDate()` etc. would read the *server's* local
// calendar date, which silently drifts from Bolivia's once this runs on
// a server clocked to a different timezone (e.g. plain UTC, common on
// hosting platforms) — near a day boundary that miscomputes which week
// "today" belongs to. Instead, the calendar date is derived from
// `timeZone` explicitly via getZonedDateOnly, and Monday/Saturday are
// computed as pure calendar arithmetic (safe regardless of timezone —
// no wall-clock time is involved yet) before converting each endpoint
// back to a UTC instant with zonedTimeToUtc.
export function getWeekRange(
  reference: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): ReportRange {
  const [year, month, day] = getZonedDateOnly(reference, timeZone)
    .split("-")
    .map(Number);

  // Pure calendar math (Date.UTC here is just a day-arithmetic helper,
  // not a timezone conversion — nothing about `year`/`month`/`day` came
  // from a wall-clock-in-a-zone interpretation at this point).
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const mondayDateOnly = new Date(Date.UTC(year, month - 1, day + diffToMonday))
    .toISOString()
    .slice(0, 10);
  const saturdayDateOnly = new Date(
    Date.UTC(year, month - 1, day + diffToMonday + 5),
  )
    .toISOString()
    .slice(0, 10);

  const from = zonedTimeToUtc(mondayDateOnly, timeZone);
  const to = zonedTimeToUtc(saturdayDateOnly, timeZone, {
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  });

  return { from, to };
}

export type SalesSummary = {
  count: number;
  totalRevenue: number;
  totalAmountPaid: number;
  totalBalanceDue: number;
};

// Pure calculation (no Prisma involved) — kept separate so it can be
// unit tested directly, same reasoning as calculateSaleTotals in
// lib/inventory.ts (CLAUDE.md section 7: money-touching code needs
// tests).
export function summarizeSales(
  sales: { totalPrice: number; amountPaid: number; balanceDue: number }[],
): SalesSummary {
  return sales.reduce(
    (acc, sale) => ({
      count: acc.count + 1,
      totalRevenue: roundCurrency(acc.totalRevenue + sale.totalPrice),
      totalAmountPaid: roundCurrency(acc.totalAmountPaid + sale.amountPaid),
      totalBalanceDue: roundCurrency(acc.totalBalanceDue + sale.balanceDue),
    }),
    { count: 0, totalRevenue: 0, totalAmountPaid: 0, totalBalanceDue: 0 },
  );
}

export type ReportData = {
  range: ReportRange;
  sales: (Sale & { seller: { name: string } })[];
  salesSummary: SalesSummary;
  materials: Material[];
  products: Product[];
};

// Sales are filtered by `range`; inventory is NOT — there's no
// historical stock-snapshot table (01-business-rules.md section 7 asks
// for inventory "status", not a point-in-time reconstruction), so the
// materials/products sections always reflect current stock as of when
// the report is generated, regardless of the selected date range. This
// is documented in the PDF itself (see "pdfGeneratedAt" / inventory
// section title).
export async function getReportData(range: ReportRange): Promise<ReportData> {
  const [sales, materials, products] = await Promise.all([
    prisma.sale.findMany({
      where: {
        deletedAt: null,
        saleDate: { gte: range.from, lte: range.to },
      },
      include: { seller: { select: { name: true } } },
      orderBy: { saleDate: "asc" },
    }),
    prisma.material.findMany({
      where: { deletedAt: null },
      orderBy: { materialType: "asc" },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { description: "asc" },
    }),
  ]);

  const salesSummary = summarizeSales(
    sales.map((sale) => ({
      totalPrice: sale.totalPrice.toNumber(),
      amountPaid: sale.amountPaid.toNumber(),
      balanceDue: sale.balanceDue.toNumber(),
    })),
  );

  return { range, sales, salesSummary, materials, products };
}

// Resolves every translation namespace the PDF needs and hands them to
// the (JSX) render function — kept here rather than duplicated in both
// route handlers. `timeZone` is whoever requested the report (the admin
// generating the manual one) — see DEFAULT_TIMEZONE's use in the cron
// route for the automated weekly email, which has no single "viewer".
export async function generateReportPdf(
  data: ReportData,
  locale: string,
  timeZone: string,
): Promise<Buffer> {
  const [t, tSaleType, tCity, tUnit, tSize, tProducts] = await Promise.all([
    getTranslations({ locale, namespace: "Reports" }),
    getTranslations({ locale, namespace: "SaleType" }),
    getTranslations({ locale, namespace: "City" }),
    getTranslations({ locale, namespace: "Unit" }),
    getTranslations({ locale, namespace: "Size" }),
    getTranslations({ locale, namespace: "Products" }),
  ]);

  return renderReportPdf({
    data,
    locale,
    timeZone,
    t,
    tSaleType,
    tCity,
    tUnit,
    tSize,
    tProducts,
  });
}
