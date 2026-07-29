import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getMaterialById } from "@/lib/inventory";
import { MaterialForm } from "@/components/materials/material-form";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditMaterialPage({ params }: Props) {
  const { locale, id } = await params;
  const session = await auth();

  // Defense in depth: see new/page.tsx.
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}/inventory/materials`);
  }

  const material = await getMaterialById(id);
  if (!material) {
    notFound();
  }

  const t = await getTranslations("Materials");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("editTitle")}</h1>
      <MaterialForm material={material} />
    </div>
  );
}
