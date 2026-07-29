import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { auth } from "@/lib/auth";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EMA — Euforia Moda Administrator",
  description: "Control de inventario y ventas de Euforia Moda",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Seeds the *initial* theme from the signed-in user's saved preference
  // (01-business-rules.md section 8) instead of always starting from
  // "system" — next-themes still lets a manual toggle override it for
  // that browser afterward via its own localStorage persistence (see
  // components/ui/theme-toggle.tsx), this only changes the first-paint
  // default. No session (e.g. the login page) falls back to "system".
  const session = await auth();
  const defaultTheme = session?.user.settings.theme.toLowerCase() ?? "system";

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale}>
          <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
