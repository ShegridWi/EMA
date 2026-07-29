import type { DefaultSession } from "next-auth";
import type { Role, City, Theme, Locale } from "@/app/generated/prisma/enums";

// Cached at sign-in time only (see the jwt() callback in lib/auth.ts) —
// a settings change made later via /settings is reflected there
// immediately (it re-reads the DB directly) but won't update this
// session copy until the next login. That's an accepted trade-off: the
// business ask was "apply the saved theme/language at login", not
// "live-sync every open session" (01-business-rules.md section 8).
type SessionUserSettings = {
  timezone: string;
  theme: Theme;
  locale: Locale;
};

declare module "next-auth" {
  interface User {
    role: Role;
    city: City;
    settings: SessionUserSettings;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      city: City;
      settings: SessionUserSettings;
    } & DefaultSession["user"];
  }
}

// Note: NOT augmenting "next-auth/jwt" here — the `JWT` interface it
// re-exports actually lives in the (nested, non-hoisted) `@auth/core`
// package, so augmenting the "next-auth/jwt" specifier doesn't merge with
// it. `token` fields are cast explicitly instead where they're read (see
// lib/auth.ts).
