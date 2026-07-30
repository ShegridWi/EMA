"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Language");
  const nextLocale = locale === "es" ? "en" : "es";

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      aria-label={t("toggle")}
      title={t("toggle")}
      // h-10 matches the size-10 icon buttons next to it (ThemeToggle, the
      // login link) — see .claude/skills/icon-system/SKILL.md — but this
      // one needs auto width instead of a fixed square to fit the locale
      // code next to the icon.
      className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold text-foreground transition-colors duration-200 ease-in-out hover:border-primary hover:text-primary"
    >
      <Languages className="size-5" />
      <span className="uppercase">{locale}</span>
    </button>
  );
}
