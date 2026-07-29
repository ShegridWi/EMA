"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

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
    return <div className="h-8 w-16" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t("toggle")}
      className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
    >
      {isDark ? t("light") : t("dark")}
    </button>
  );
}
