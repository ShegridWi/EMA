import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getUserById, serializeUser } from "@/lib/users";
import { UserForm } from "@/components/users/user-form";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function EditUserPage({ params }: Props) {
  const { locale, id } = await params;
  const session = await auth();

  // Defense in depth: see new/page.tsx.
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}/users`);
  }

  const user = await getUserById(id);
  if (!user) {
    notFound();
  }

  const t = await getTranslations("Users");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("editTitle")}</h1>
      <UserForm user={serializeUser(user)} />
    </div>
  );
}
