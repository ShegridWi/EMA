import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";

export default async function DashboardHomePage() {
  const session = await auth();
  const t = await getTranslations("Dashboard");

  const roleLabel =
    session?.user.role === "ADMIN" ? t("roleAdmin") : t("roleSeller");
  const cityLabel =
    session?.user.city === "LA_PAZ" ? t("cityLaPaz") : t("citySantaCruz");

  return (
    <div>
      <h1 className="text-xl font-semibold">
        {t("welcome", { name: session?.user.name ?? "" })}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {roleLabel} · {cityLabel}
      </p>
    </div>
  );
}
