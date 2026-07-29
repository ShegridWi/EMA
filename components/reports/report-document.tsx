import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/currency";
import { formatInTimezone } from "@/lib/timezone";
import type { ReportData } from "@/lib/reports";

// Purely presentational — all copy comes in as already-resolved
// translation functions (components/ui convention, 05-nextjs-conventions.md),
// so this file has no next-intl calls of its own. It renders entirely
// server-side (inside a route handler, never crossing a Client Component
// boundary), so passing functions as props is fine here — this isn't a
// Server Action/Client Component split.
type TFn = Awaited<ReturnType<typeof getTranslations>>;

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2 },
  subtitle: { fontSize: 10, marginBottom: 2, color: "#555555" },
  sectionTitle: { fontSize: 12, marginTop: 18, marginBottom: 6 },
  table: { display: "flex", flexDirection: "column" },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 3,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#dddddd",
    paddingVertical: 2,
  },
  cell: { flex: 1 },
  headerCell: { flex: 1, fontFamily: "Helvetica-Bold" },
  empty: { fontSize: 9, color: "#777777", marginTop: 4 },
  summary: { marginTop: 6, fontSize: 9 },
});

export type ReportDocumentProps = {
  data: ReportData;
  locale: string;
  timeZone: string;
  t: TFn;
  tSaleType: TFn;
  tCity: TFn;
  tUnit: TFn;
  tSize: TFn;
  tProducts: TFn;
};

export function ReportDocument({
  data,
  locale,
  timeZone,
  t,
  tSaleType,
  tCity,
  tUnit,
  tSize,
  tProducts,
}: ReportDocumentProps) {
  const formatDate = (date: Date) =>
    formatInTimezone(date, timeZone, locale, { dateStyle: "medium" });
  const { range, sales, salesSummary, materials, products } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{t("pdfTitle")}</Text>
        <Text style={styles.subtitle}>
          {t("pdfRangeLabel", {
            from: formatDate(range.from),
            to: formatDate(range.to),
          })}
        </Text>
        <Text style={styles.subtitle}>
          {t("pdfGeneratedAt", { date: formatDate(new Date()) })}
        </Text>

        <Text style={styles.sectionTitle}>{t("salesSectionTitle")}</Text>
        {sales.length === 0 ? (
          <Text style={styles.empty}>{t("salesEmpty")}</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>{t("salesColDate")}</Text>
              <Text style={[styles.headerCell, { flex: 2 }]}>
                {t("salesColDescription")}
              </Text>
              <Text style={styles.headerCell}>{t("salesColCity")}</Text>
              <Text style={styles.headerCell}>{t("salesColSaleType")}</Text>
              <Text style={styles.headerCell}>{t("salesColQuantity")}</Text>
              <Text style={styles.headerCell}>{t("salesColTotalPrice")}</Text>
              <Text style={styles.headerCell}>{t("salesColAmountPaid")}</Text>
              <Text style={styles.headerCell}>{t("salesColBalanceDue")}</Text>
            </View>
            {sales.map((sale) => (
              <View key={sale.id} style={styles.row}>
                <Text style={styles.cell}>
                  {formatDate(sale.saleDate)}
                </Text>
                <Text style={[styles.cell, { flex: 2 }]}>
                  {sale.description}
                </Text>
                <Text style={styles.cell}>{tCity(sale.city)}</Text>
                <Text style={styles.cell}>{tSaleType(sale.saleType)}</Text>
                <Text style={styles.cell}>{sale.quantity}</Text>
                <Text style={styles.cell}>
                  {formatCurrency(sale.totalPrice.toString())}
                </Text>
                <Text style={styles.cell}>
                  {formatCurrency(sale.amountPaid.toString())}
                </Text>
                <Text style={styles.cell}>
                  {formatCurrency(sale.balanceDue.toString())}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.summary}>
          <Text>{t("summaryCount", { count: salesSummary.count })}</Text>
          <Text>
            {t("summaryTotalRevenue", {
              amount: formatCurrency(salesSummary.totalRevenue),
            })}
          </Text>
          <Text>
            {t("summaryTotalAmountPaid", {
              amount: formatCurrency(salesSummary.totalAmountPaid),
            })}
          </Text>
          <Text>
            {t("summaryTotalBalanceDue", {
              amount: formatCurrency(salesSummary.totalBalanceDue),
            })}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{t("inventorySectionTitle")}</Text>

        <Text style={{ fontSize: 10, marginBottom: 4 }}>
          {t("materialsSectionTitle")}
        </Text>
        {materials.length === 0 ? (
          <Text style={styles.empty}>{t("materialsEmpty")}</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>{t("materialsColType")}</Text>
              <Text style={styles.headerCell}>
                {t("materialsColSubtype")}
              </Text>
              <Text style={styles.headerCell}>{t("materialsColColor")}</Text>
              <Text style={styles.headerCell}>
                {t("materialsColQuantity")}
              </Text>
              <Text style={styles.headerCell}>{t("materialsColUnit")}</Text>
              <Text style={styles.headerCell}>{t("materialsColCity")}</Text>
            </View>
            {materials.map((material) => (
              <View key={material.id} style={styles.row}>
                <Text style={styles.cell}>{material.materialType}</Text>
                <Text style={styles.cell}>{material.type}</Text>
                <Text style={styles.cell}>{material.color ?? "—"}</Text>
                <Text style={styles.cell}>{material.quantity.toString()}</Text>
                <Text style={styles.cell}>{tUnit(material.unit)}</Text>
                <Text style={styles.cell}>{tCity(material.city)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 10, marginTop: 12, marginBottom: 4 }}>
          {t("productsSectionTitle")}
        </Text>
        {products.length === 0 ? (
          <Text style={styles.empty}>{t("productsEmpty")}</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { flex: 2 }]}>
                {t("productsColDescription")}
              </Text>
              <Text style={styles.headerCell}>{t("productsColColor")}</Text>
              <Text style={styles.headerCell}>{t("productsColSize")}</Text>
              <Text style={styles.headerCell}>
                {t("productsColQuantity")}
              </Text>
              <Text style={styles.headerCell}>{t("productsColCity")}</Text>
              <Text style={styles.headerCell}>{t("productsColKind")}</Text>
            </View>
            {products.map((product) => (
              <View key={product.id} style={styles.row}>
                <Text style={[styles.cell, { flex: 2 }]}>
                  {product.description}
                </Text>
                <Text style={styles.cell}>{product.color}</Text>
                <Text style={styles.cell}>{tSize(product.size)}</Text>
                <Text style={styles.cell}>{product.quantity}</Text>
                <Text style={styles.cell}>{tCity(product.city)}</Text>
                <Text style={styles.cell}>
                  {product.kind === "SET"
                    ? tProducts("kindSet")
                    : tProducts("kindUnit")}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export function renderReportPdf(props: ReportDocumentProps): Promise<Buffer> {
  return renderToBuffer(<ReportDocument {...props} />);
}
