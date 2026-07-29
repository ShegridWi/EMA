import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardNav } from "@/components/dashboard-nav";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await auth();

  // The proxy (proxy.ts) already redirects unauthenticated requests for
  // UX; this is the real server-side guard for this layout's content
  // (CLAUDE.md section 7 — never rely on the proxy alone).
  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("Nav");
  const tCommon = await getTranslations("Common");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="font-semibold">{tCommon("appName")}</span>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: `/${locale}/login` });
            }}
          >
            <button type="submit" className="text-sm underline">
              {t("signOut")}
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1">
        <DashboardNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
