"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("Theme");

  useEffect(() => {
    // This mount flag (not a derived/external value) is the standard
    // next-themes pattern to avoid a server/client render mismatch, since
    // the resolved theme is only knowable after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Avoids a hydration mismatch: the resolved theme is only known
    // client-side (next-themes reads it from localStorage/media query).
    return <div className="size-10" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t("toggle")}
      // size-10 matches every other IconButton in the header (LogOut,
      // the mobile drawer hamburger); size-6 icon matches the login
      // page's brand badge (components/login-card.tsx via
      // app/[locale]/(auth)/login/page.tsx) — this button previously
      // predated the IconButton primitive and was sized ad hoc
      // (size-8/size-5), which is what made it look inconsistent.
      className="flex size-10 cursor-pointer items-center justify-center rounded-md border border-border transition-colors duration-200 ease-in-out hover:bg-muted"
    >
      {isDark ? (
        <Sun className="size-6 transition-transform duration-200 ease-in-out hover:scale-110" />
      ) : (
        <Moon className="size-6 transition-transform duration-200 ease-in-out hover:scale-110" />
      )}
    </button>
  );
}
