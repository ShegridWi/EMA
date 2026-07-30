import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { MutedText } from "@/components/ui/muted-text";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  // Admin-only, no exceptions (03-roles-permissions.md "Reports" row).
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("Reports");

  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <MutedText className="max-w-prose">{t("description")}</MutedText>

      {/* Plain GET form to the route handler — the browser downloads the
          PDF response directly (Content-Disposition: attachment), no
          client JS needed. */}
      <form
        action="/api/reports"
        method="GET"
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="locale" value={locale} />
        <FormField label={t("dateFrom")} htmlFor="from">
          <Input
            id="from"
            name="from"
            type="date"
            required
            defaultValue={defaultFrom}
          />
        </FormField>
        <FormField label={t("dateTo")} htmlFor="to">
          <Input
            id="to"
            name="to"
            type="date"
            required
            defaultValue={defaultTo}
          />
        </FormField>
        <Button type="submit">{t("download")}</Button>
      </form>
    </div>
  );
}
