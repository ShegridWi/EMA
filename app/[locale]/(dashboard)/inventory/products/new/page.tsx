import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ProductForm } from "@/components/products/product-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewUnitProductPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  // Defense in depth: the list page already hides this route for
  // non-admins, but a direct visit must still be blocked server-side
  // (CLAUDE.md section 7). The Server Action re-checks this too.
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}/inventory/products`);
  }

  const t = await getTranslations("Products");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("newUnitTitle")}</h1>
      <ProductForm />
    </div>
  );
}
