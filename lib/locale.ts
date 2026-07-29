import type { Locale } from "@/app/generated/prisma/enums";

// Pure constant mapping, deliberately kept in its own file with no
// Prisma/server-only imports — lib/user-settings.ts (which does import
// Prisma) can't be imported from Client Components like
// components/settings/settings-form.tsx without dragging server-only
// code into the browser bundle.

// Maps the `Locale` enum (kept SCREAMING_SNAKE_CASE for consistency
// with every other enum in this schema) to next-intl's route locale
// codes — see i18n/routing.ts.
export const LOCALE_TO_ROUTE: Record<Locale, string> = {
  ES: "es",
  EN: "en",
};

export const ROUTE_TO_LOCALE: Record<string, Locale> = {
  es: "ES",
  en: "EN",
};
