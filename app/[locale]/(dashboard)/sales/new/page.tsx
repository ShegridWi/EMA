import { getTranslations } from "next-intl/server";
import { listProducts, serializeProduct } from "@/lib/inventory";
import { getPedidoById } from "@/lib/pedidos";
import { MODELS } from "@/lib/landing-catalog";
import { SaleForm } from "@/components/sales/sale-form";

type Props = {
  searchParams: Promise<{ pedidoId?: string }>;
};

export default async function NewSalePage({ searchParams }: Props) {
  // Both ADMIN and SELLER can register sales (03-roles-permissions.md) —
  // no role redirect needed here, unlike the materials/products mutation
  // pages.
  const products = await listProducts();
  const t = await getTranslations("Sales");

  const { pedidoId } = await searchParams;
  // Fetched by id rather than carrying every field through the query
  // string — a single source of truth for both the form's pre-filled
  // values and the read-only summary panel below, and nothing here can
  // go stale/tampered the way URL params could. Authorization for the
  // actual conversion is enforced by convertPedidoToSale itself
  // (lib/pedidos.ts) when the form is submitted — this page only reads.
  const pedido = pedidoId ? await getPedidoById(pedidoId) : null;

  let pedidoSummary: { label: string; value: string }[] | null = null;
  if (pedido) {
    const [tPedidos, tRequestKind, tCity, tSize, tLanding] = await Promise.all([
      getTranslations("Pedidos"),
      getTranslations("RequestKind"),
      getTranslations("City"),
      getTranslations("Size"),
      getTranslations("Landing"),
    ]);

    const modelLabel = tLanding(
      MODELS.find((model) => model.key === pedido.model)?.nameKey ??
        pedido.model,
    );
    const colorLabel = tLanding(pedido.color);
    const genderLabel = tLanding(
      pedido.gender === "MALE" ? "genderMale" : "genderFemale",
    );

    pedidoSummary = [
      { label: tPedidos("kind"), value: tRequestKind(pedido.kind) },
      { label: tPedidos("customer"), value: pedido.customerName },
      { label: tPedidos("customerPhone"), value: pedido.customerPhone },
      { label: tPedidos("city"), value: tCity(pedido.city) },
      {
        label: tPedidos("productSummary"),
        value: `${genderLabel}, ${modelLabel}, ${colorLabel}${pedido.size ? `, ${tSize(pedido.size)}` : ""}`,
      },
      ...(pedido.quantity !== null
        ? [{ label: tPedidos("quantity"), value: String(pedido.quantity) }]
        : []),
      ...(pedido.estimatedQuantity
        ? [
            {
              label: tPedidos("quoteEstimatedQuantity"),
              value: pedido.estimatedQuantity,
            },
          ]
        : []),
      ...(pedido.usageContext
        ? [{ label: tPedidos("quoteUsageContext"), value: pedido.usageContext }]
        : []),
      ...(pedido.desiredTimeframe
        ? [
            {
              label: tPedidos("quoteDesiredTimeframe"),
              value: pedido.desiredTimeframe,
            },
          ]
        : []),
      ...(pedido.additionalDetails
        ? [
            {
              label: tPedidos("quoteAdditionalDetails"),
              value: pedido.additionalDetails,
            },
          ]
        : []),
      { label: tPedidos("notes"), value: pedido.notes },
    ];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("newTitle")}</h1>
      <SaleForm
        products={products.map(serializeProduct)}
        pedidoId={pedido?.id}
        pedidoSummary={pedidoSummary}
        initialValues={
          pedido
            ? {
                quantity: pedido.quantity ? String(pedido.quantity) : undefined,
                customerName: pedido.customerName,
                customerPhone: pedido.customerPhone,
                notes: pedido.notes,
              }
            : undefined
        }
      />
    </div>
  );
}
