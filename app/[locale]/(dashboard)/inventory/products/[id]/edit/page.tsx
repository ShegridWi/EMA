import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getProductById, serializeProduct } from "@/lib/inventory";
import { ProductForm } from "@/components/products/product-form";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditProductPage({ params }: Props) {
  const { locale, id } = await params;
  const session = await auth();

  // Defense in depth: see new/page.tsx.
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}/inventory/products`);
  }

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  const t = await getTranslations("Products");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("editTitle")}</h1>
      <ProductForm product={serializeProduct(product)} />
    </div>
  );
}
