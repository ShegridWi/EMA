import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";

export default async function DashboardHomePage() {
  const session = await auth();
  const t = await getTranslations("Dashboard");
  const tRole = await getTranslations("Role");
  const tCity = await getTranslations("City");

  return (
    <div>
      <h1 className="text-xl font-semibold">
        {t("welcome", { name: session?.user.name ?? "" })}
      </h1>
      <p className="text-sm text-muted-foreground">
        {session?.user.role && tRole(session.user.role)} ·{" "}
        {session?.user.city && tCity(session.user.city)}
      </p>
    </div>
  );
}
