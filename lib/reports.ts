import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { roundCurrency } from "@/lib/inventory";
import { renderReportPdf } from "@/components/reports/report-document";
import type { Sale, Material, Product } from "@/app/generated/prisma/client";

// Read-only reporting layer, shared by the manual report
// (app/api/reports/route.ts) and the automatic weekly one
// (app/api/cron/weekly-report/route.ts) so the data query and PDF
// rendering aren't duplicated between the two (.prompts/08-reports.md).

export type ReportRange = { from: Date; to: Date };

// The automatic weekly report runs every Saturday and covers that same
// business week — Monday 00:00 through Saturday 23:59:59.999. A
// reference date that falls on a Sunday is treated as still belonging to
// the *previous* week (there's no real-world case where the cron fires
// on a Sunday, but the function stays sane for any input).
export function getWeekRange(reference: Date = new Date()): ReportRange {
  const day = reference.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const from = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate() + diffToMonday,
    0,
    0,
    0,
    0,
  );
  const to = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate() + 5,
    23,
    59,
    59,
    999,
  );

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
// route handlers.
export async function generateReportPdf(
  data: ReportData,
  locale: string,
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
    t,
    tSaleType,
    tCity,
    tUnit,
    tSize,
    tProducts,
  });
}
