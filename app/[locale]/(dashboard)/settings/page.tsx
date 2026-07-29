import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getOrCreateUserSettings } from "@/lib/user-settings";
import { SettingsForm } from "@/components/settings/settings-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  // Any signed-in user, not admin-only — everyone manages their own
  // preferences (03-roles-permissions.md "Settings" row).
  if (!session) {
    redirect(`/${locale}/login`);
  }

  // Reads directly from the DB (not session.user.settings) so the form
  // always shows the latest saved values, even if the JWT session cache
  // is from before the most recent change (types/next-auth.d.ts).
  const settings = await getOrCreateUserSettings(session.user.id);

  const t = await getTranslations("Settings");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
