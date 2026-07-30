import { getTranslations } from "next-intl/server";
import { listProducts, serializeProduct } from "@/lib/inventory";
import { SaleForm } from "@/components/sales/sale-form";

type Props = {
  searchParams: Promise<{
    pedidoId?: string;
    quantity?: string;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
  }>;
};

export default async function NewSalePage({ searchParams }: Props) {
  // Both ADMIN and SELLER can register sales (03-roles-permissions.md) —
  // no role redirect needed here, unlike the materials/products mutation
  // pages.
  const products = await listProducts();
  const t = await getTranslations("Sales");

  const { pedidoId, quantity, customerName, customerPhone, notes } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("newTitle")}</h1>
      <SaleForm
        products={products.map(serializeProduct)}
        pedidoId={pedidoId}
        initialValues={
          pedidoId ? { quantity, customerName, customerPhone, notes } : undefined
        }
      />
    </div>
  );
}
