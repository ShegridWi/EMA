import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ReportsPage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();

  // Admin-only, no exceptions (03-roles-permissions.md "Reports" row).
  if (session?.user.role !== "ADMIN") {
    redirect(`/${locale}`);
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
      <p className="max-w-prose text-sm text-zinc-500 dark:text-zinc-400">
        {t("description")}
      </p>

      {/* Plain GET form to the route handler — the browser downloads the
          PDF response directly (Content-Disposition: attachment), no
          client JS needed. */}
      <form
        action="/api/reports"
        method="GET"
        className="flex flex-wrap items-end gap-2"
      >
        <input type="hidden" name="locale" value={locale} />
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-sm font-medium">
            {t("dateFrom")}
          </label>
          <input
            id="from"
            name="from"
            type="date"
            required
            defaultValue={defaultFrom}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-sm font-medium">
            {t("dateTo")}
          </label>
          <input
            id="to"
            name="to"
            type="date"
            required
            defaultValue={defaultTo}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {t("download")}
        </button>
      </form>
    </div>
  );
}
