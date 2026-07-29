import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SetProductForm } from "@/components/products/set-product-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewSetProductPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  // Defense in depth: see new/page.tsx.
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}/inventory/products`);
  }

  const t = await getTranslations("Products");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("newSetTitle")}</h1>
      <SetProductForm />
    </div>
  );
}
