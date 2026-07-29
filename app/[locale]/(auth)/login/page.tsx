import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/login-form";
import { LoginCard } from "@/components/login-card";
import { Shirt } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("Login");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted p-4 sm:p-8">
      <LoginCard>
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Shirt className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <LoginForm locale={locale} />
      </LoginCard>
    </div>
  );
}
