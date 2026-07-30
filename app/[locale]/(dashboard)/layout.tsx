import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ToastProvider } from "@/components/ui/toast-provider";
import { DashboardNav, NavLinks } from "@/components/dashboard-nav";
import { MobileNavDrawer } from "@/components/mobile-nav-drawer";
import { PedidoBadge } from "@/components/pedido-badge";
import { IconButton } from "@/components/ui/icon-button";
import { LogOut } from "lucide-react";

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
  const tDashboard = await getTranslations("Dashboard");

  return (
    <ToastProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <MobileNavDrawer
              openLabel={t("openMenu")}
              closeLabel={t("closeMenu")}
            >
              <NavLinks />
            </MobileNavDrawer>
            <span className="font-semibold">{tCommon("appName")}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {tDashboard("welcome", { name: session.user.name ?? "" })}
            </span>
            <PedidoBadge />
            <ThemeToggle />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: `/${locale}/login` });
              }}
            >
              <IconButton
                type="submit"
                icon={<LogOut className="size-5" />}
                label={t("signOut")}
              />
            </form>
          </div>
        </header>
        <div className="flex flex-1">
          <DashboardNav />
          <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
