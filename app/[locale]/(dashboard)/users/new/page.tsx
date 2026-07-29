import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { UserForm } from "@/components/users/user-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewUserPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  // Defense in depth: the list page already blocks non-admins, but a
  // direct visit must still be rejected server-side. The Server Action
  // re-checks this too.
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}/users`);
  }

  const t = await getTranslations("Users");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("newTitle")}</h1>
      <UserForm />
    </div>
  );
}
