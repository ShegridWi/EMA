import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { routing } from "@/i18n/routing";

// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`
// (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
// This file only redirects unauthenticated users for UX purposes. It is
// NOT the security boundary: every Server Action re-checks the session
// and role server-side (CLAUDE.md section 7 / 05-nextjs-conventions.md).

const handleI18nRouting = createMiddleware(routing);

const PUBLIC_PATHS = ["/", "/login"];

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  const segments = pathname.split("/").filter(Boolean);
  const maybeLocale = segments[0];
  const locales: readonly string[] = routing.locales;
  if (maybeLocale && locales.includes(maybeLocale)) {
    return { locale: maybeLocale, rest: "/" + segments.slice(1).join("/") };
  }
  return { locale: null, rest: pathname };
}

export default auth((req) => {
  const { nextUrl } = req;
  const { locale, rest } = stripLocale(nextUrl.pathname);
  const normalizedRest = rest.length > 1 ? rest.replace(/\/$/, "") : rest;
  const targetLocale = locale ?? routing.defaultLocale;

  const isPublicPath = PUBLIC_PATHS.includes(normalizedRest);

  if (!req.auth && !isPublicPath) {
    return NextResponse.redirect(
      new URL(`/${targetLocale}/login`, nextUrl.origin),
    );
  }

  // Signed-in users skip the public landing page and the login form —
  // both send them straight into the app instead.
  if (req.auth && (normalizedRest === "/login" || normalizedRest === "/")) {
    return NextResponse.redirect(
      new URL(`/${targetLocale}/dashboard`, nextUrl.origin),
    );
  }

  return handleI18nRouting(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
