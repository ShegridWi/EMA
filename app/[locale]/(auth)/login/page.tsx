import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("Login");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </div>
      <LoginForm locale={locale} />
    </div>
  );
}
