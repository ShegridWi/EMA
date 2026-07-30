# Next.js + TypeScript conventions

Concrete conventions for this stack, scoped to a small, low-maintenance
internal tool (see `CLAUDE.md` section 1). Prefer boring, well-supported
choices over trendy ones.

## AI agent integration (`AGENTS.md`)

Next.js 16.2+ bundles version-matched documentation inside the `next`
package at `node_modules/next/dist/docs/`, and officially recommends an
`AGENTS.md` file at the project root telling coding agents to read those
bundled docs instead of relying on (possibly stale) training data. See
https://nextjs.org/docs/app/guides/ai-agents.

This project already has that file at the repo root (`AGENTS.md`), and the
root `CLAUDE.md` pulls it in via Claude Code's `@AGENTS.md` import syntax
so the instruction is always loaded — no duplication needed.

- The `<!-- BEGIN:nextjs-agent-rules -->` / `<!-- END:nextjs-agent-rules -->`
  markers in `AGENTS.md` delimit the Next.js-managed block. Don't hand-edit
  inside it; add project-specific agent notes outside the markers instead
  (or, for this project, just keep using `CLAUDE.md` / `.claude/docs/` —
  that's already outside the managed block).
- **When scaffolding with `create-next-app`**: it auto-generates its own
  `AGENTS.md` and `CLAUDE.md`. Since this project already has a hand-written
  `CLAUDE.md` with all the business/domain context, run it with
  `--no-agents-md` and keep the `AGENTS.md` + `@AGENTS.md` import already in
  place, rather than letting it overwrite the root `CLAUDE.md`.
- Optional follow-up once the app exists and runs: the [Next.js MCP
  server](https://nextjs.org/docs/app/guides/mcp) lets agents inspect live
  app state (routes, build errors) — not needed before scaffolding, revisit
  only if debugging friction shows up.
- For manually driving the running app in a browser to verify a change
  (not just unit tests), Anthropic's official `webapp-testing` skill
  (from https://github.com/anthropics/skills) is a reasonable fit once
  there's an app to test — it's maintained by Anthropic, unlike most
  third-party "Next.js skill" marketplace listings, which are unverified
  and often just repackage what's already in this document.

## Project structure (App Router)

```
app/
  (marketing)/
    page.tsx                 # public landing page (LandingHero), no login
    pedido/
      page.tsx                # public order/quote request form
      confirmacion/           # full-page "request received" + auto-redirect
  (auth)/
    login/
  (dashboard)/
    inventory/
      materials/
      products/
    sales/
    pedidos/                  # admin: claim/convert public requests
      [id]/
    reports/
    users/
    movement-log/
  api/
    cron/
      weekly-report/        # protected route hit by an external scheduler
components/
  ui/                        # generic, presentation-only components
  pedido/                    # public-form components (pedido-form, image cycler)
  pedidos/                   # admin-side components (claim/cancel/release actions)
lib/
  actions/                   # Server Actions, one file per module
  validations/               # Zod schemas, shared by client + server
  db.ts                      # Prisma client singleton
  auth.ts                    # Auth.js config
  audit.ts                   # centralized audit-log writer
  inventory.ts               # centralized stock-mutation functions (Material/Product/Sale)
  pedidos.ts                 # centralized PublicRequest mutation functions
  landing-catalog.ts         # shared landing gender/model/color/size catalog
prisma/
  schema.prisma
  migrations/
messages/
  es.json
  en.json
tests/
```

- kebab-case for files and folders, `PascalCase` for React components,
  `camelCase` for functions/variables, `SCREAMING_SNAKE_CASE` for env vars.
- Route groups (`(auth)`, `(dashboard)`) split layouts without affecting
  URLs.

## Prisma setup (v7 — driver adapters are mandatory)

This project is on Prisma 7, generated with `generator client { provider =
"prisma-client" }` (the new generator, not the legacy `prisma-client-js`).
Two things about it are easy to get wrong and both bit us during initial
setup, so they're recorded here instead of being rediscovered by trial and
error:

1. **The generated client has no `index.ts`.** Import from the `client`
   subpath, not the package root:
   `import { PrismaClient } from "@/app/generated/prisma/client"` — not
   `"@/app/generated/prisma"`.
2. **`new PrismaClient()` with no arguments is a compile error.** Prisma 7
   dropped the built-in query engine binary for the SQL path — you must
   pass a driver adapter. For PostgreSQL that's `@prisma/adapter-pg`
   (wrapping the `pg` driver, both already installed). See `lib/db.ts` for
   the actual singleton:

```ts
// lib/db.ts
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- `app/generated/prisma/` is generated output — it's git-ignored (see
  `.gitignore`) and regenerated with `npx prisma generate` (also runs
  automatically via the `postinstall` hook once one exists — for now, run
  it manually after cloning and after every schema change).
- Local PostgreSQL runs via `docker compose up -d` (see `docker-compose.yml`
  at the repo root); `DATABASE_URL` in `.env` already points at it. Copy
  `.env.example` to `.env` for a fresh clone.
- Prisma's own CLI/Client/Postgres-setup skills are installed at
  `.agents/skills/prisma-*` (added automatically by `prisma init`, symlinked
  from `.windsurf/skills/` too) — Claude Code picks these up alongside the
  project-specific ones in `.claude/skills/`. Prefer those over general
  Prisma knowledge when in doubt, since they're pinned to the v7 API
  actually installed here (see `skills-lock.json`).

## Server Components vs. Client Components

- Default to **Server Components**. Add `"use client"` only where
  interactivity is actually needed (forms, modals, local state).
- Data fetching for read-only pages happens directly in Server Components
  via Prisma — no need for a client-side fetch layer for simple lists.

## Reusable UI primitives (`components/ui/`)

Generic, presentation-only components live in `components/ui/` and take
all copy as props (no `next-intl` calls inside them) — the caller passes
translated strings, keeping these components decoupled from any one
feature.

- **`PromptModal`** (`components/ui/prompt-modal.tsx`): a "confirm this
  action, optionally explain why" dialog built on the native `<dialog>`
  element (no UI library dependency, per CLAUDE.md section 1). Use this
  instead of `window.confirm()`/`window.prompt()` whenever a mutation
  needs a confirmation step with an optional free-text detail — e.g. the
  sale return/void reason (`components/sales/sale-actions.tsx`). It's
  controlled (`open` prop owned by the caller) and only handles the
  dialog UI; the caller decides what to do with the confirmed value.
- **`ThemeToggle`** / **`ThemeProvider`** (`components/ui/theme-*.tsx`):
  see the Theme section below.

## Currency (`lib/currency.ts`)

The business operates in **Bolivianos (BOB)** by default — see the
resolved assumption in `04-scope-mvp.md`. `lib/currency.ts` exports
`formatCurrency(amount, currency = "BOB")`, used in every list view that
displays a money amount (Materials, Products, Sales) to render it as
`Bs 150.00`. No form collects a currency choice yet; adding one (e.g. for
USD-denominated sales) would need a schema column, not just a formatting
change — don't assume `formatCurrency`'s default covers that case.

## Server Actions (the only way to mutate data)

Every Server Action follows this shape, in this order:

1. `"use server"` at the top of the file.
2. Read the session (Auth.js) and **check the role server-side** — never
   trust that a button was hidden in the UI.
3. Parse and validate input with a **Zod schema** from
   `lib/validations/`.
4. Call a **centralized function** for the actual mutation (e.g.
   `lib/inventory.ts`) — this is what the project's core rule requires:
   inventory quantities are never updated with a direct Prisma call from
   inside the action; the centralized function does the update **and**
   writes the audit log entry in the same transaction.
5. Return a typed result: `{ success: true, data }` or
   `{ success: false, error }`. Don't throw across the Server
   Action/client boundary for expected validation failures.

```ts
// lib/actions/materials.ts
"use server";

import { auth } from "@/lib/auth";
import { createMaterialSchema } from "@/lib/validations/material";
import { createMaterial } from "@/lib/inventory";

export async function createMaterialAction(input: unknown) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    return { success: false as const, error: "Forbidden" };
  }

  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const material = await createMaterial(parsed.data, session.user.id);
  return { success: true as const, data: material };
}
```

`createMaterial` (in `lib/inventory.ts`) is what wraps the Prisma write and
the `MovementLog` insert in a `prisma.$transaction`. No other code path is
allowed to touch `Material`/`Product` quantity fields directly.

The same rule applies per-domain to every other centralized mutation
file — `lib/users.ts` is the only place allowed to call `prisma.user.*`
mutations, `lib/pedidos.ts` (phase 10) the only place allowed to call
`prisma.publicRequest.*`, and so on. When adding a new domain, follow
this same shape: one `lib/<domain>.ts` owning all its Prisma writes,
one `lib/validations/<domain>.ts` for its Zod schemas, one
`lib/actions/<domain>.ts` for its Server Actions.

## Validation

- **Zod** for every Server Action input, and for any form default values
  that need parsing. Keep schemas in `lib/validations/` so client forms
  and server actions share the exact same schema — no duplicated rules.

## i18n

- **next-intl**, with `es` as the default locale and `en` as the second
  supported locale (see `CLAUDE.md` section 5 and `04-scope-mvp.md`).
- Translation strings live in `messages/es.json` and `messages/en.json`,
  mirrored key-for-key.
- Never hardcode user-facing strings in components — always go through
  the translation function, including validation error messages returned
  by Server Actions.

## Theme

- Tailwind's `class`-based dark mode strategy + `next-themes` for
  toggling/persisting the user's choice. No custom theme engine.
- Phase 9: `UserSettings.theme` seeds the *initial* theme for a session
  (see `01-business-rules.md` section 8) — a manual toggle mid-session
  still just works through the existing `next-themes` cookie, it no
  longer starts from a fixed default regardless of who's logged in.

## Timezone handling (phase 9)

The business only operates in Bolivia (`America/La_Paz`, fixed UTC-4,
no DST), but the timezone is a per-user setting
(`UserSettings.timezone`, `02-data-model.md`), not a hardcoded constant
— don't assume every user is on the default.

**Rule**: every `DateTime` column is stored in UTC (Postgres/Prisma's
default — nothing special to do there). Converting to/from a specific
timezone only happens at the two boundaries where a human is involved:

1. **Parsing a date-only form input** (`<input type="date">`, e.g. a
   report's date-range filter or the movement log's date filter): the
   value is a plain `YYYY-MM-DD` string with no timezone info. It must
   be interpreted as midnight in *that user's* configured timezone, not
   the server's local time — `` `${value}T00:00:00` `` (a bare local-time
   string) is wrong once this runs on a server whose OS timezone isn't
   Bolivia's.
2. **Displaying a stored UTC instant**: format it in the *viewing*
   user's configured timezone, not the server's.

`lib/timezone.ts` implements both without adding a dependency
(`date-fns-tz`/`luxon` are unnecessary for this — CLAUDE.md section 1,
avoid dependencies that aren't earning their keep):

- `formatInTimezone(date, timeZone, locale, options)`: a thin wrapper
  around `Intl.DateTimeFormat(locale, { ...options, timeZone })` —
  `Intl` already knows how to render any IANA zone correctly, DST or
  not, no extra library needed.
- `zonedTimeToUtc(dateOnlyString, timeZone)`: the harder direction
  (wall-clock-in-a-zone → correct UTC instant) has no direct built-in,
  but doesn't need a library either. The trick: format a UTC guess in
  the target zone via `Intl.DateTimeFormat(...).formatToParts()`, read
  the offset back out, and correct the guess by that offset. This
  generalizes to any IANA zone (even DST-observing ones), even though
  in practice Bolivia's fixed -4:00 makes it a non-issue for this
  business specifically.

Every date coming from a form and every date going into a list/PDF
should go through one of these two — grep for bare
`new Date(\`${...}T00:00:00\`)` or `new Intl.DateTimeFormat(locale)`
(no `timeZone` option) touching a business date before adding a new one;
either is a sign the server's local timezone is leaking in by accident.

## PDF generation (weekly report + manual reports)

- `@react-pdf/renderer`: renders PDFs from React components without
  needing a headless browser (Puppeteer/Chromium), which keeps the
  DigitalOcean App Platform footprint small and cheap.

## Email delivery

- **Nodemailer** against whatever transactional SMTP provider the
  business ends up choosing (see the open assumption in
  `04-scope-mvp.md` about recipient addresses). Keep the SMTP config in
  env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
  `EMAIL_FROM`) — don't hardcode credentials.

## Weekly report scheduling

DigitalOcean App Platform has no built-in per-app cron for a web service.
Use one of:
- A DO App Platform **Job** component with a cron schedule, calling a
  script that reuses the same report-generation function as the manual
  report.
- An external low-cost/free cron pinger (e.g. cron-job.org) hitting
  `app/api/cron/weekly-report`, protected by a shared secret
  (`CRON_SECRET`) checked in the route handler.

Pick whichever is already available on the current DO plan — don't add a
new paid service just for scheduling.

## Testing

- **Vitest** for unit tests. Per `CLAUDE.md` section 7, any feature
  touching money (sales, partial payments, balances) **must** have tests
  before merging — at minimum, the centralized functions in
  `lib/inventory.ts` and the sale-total/balance calculations.
- No E2E framework (e.g. Playwright) for the MVP — revisit only if manual
  regression testing becomes a real bottleneck for this small a team.

## Linting & formatting

- ESLint with the default `next lint` config + `@typescript-eslint`.
- Prettier for formatting, run through the ESLint integration (no
  separate format-check step to remember).
- Husky + `lint-staged` are optional, not required for the MVP — add them
  only if lint/format regressions actually start slipping into commits.

## Public (anonymous) Server Actions — pedido/cotización (phase 10)

Every Server Action up to this point starts with `const session = await
auth()` and rejects if there's no session/role match — see "Server
Actions" above. `submitPedidoAction` (`lib/actions/pedidos.ts`) is the
**first exception**: the public landing page's order/quote form has no
login at all, so there's no session to check. This is intentional, not
a missed check — the file has a comment calling it out explicitly so it
doesn't read as an oversight in review.

Since there's no auth boundary, the defense against abuse moves
elsewhere:

1. **Rate limiting by IP**, inside `createPublicPedido`
   (`lib/pedidos.ts`), before the insert — no new dependency (no
   Redis/Upstash, per CLAUDE.md section 1): a short-window count (3
   submissions / 10 minutes) and a looser daily cap (10 / 24h), both
   plain `prisma.publicRequest.count()` queries against `submissionIp`
   inside the same `$transaction` as the eventual insert. The IP itself
   comes from `headers().get("x-forwarded-for")` (DigitalOcean App
   Platform's proxy sets this; there's no `NextRequest` object available
   inside a Server Action to read it from).
2. **A honeypot field** (`website`, in `lib/validations/pedido.ts` /
   `components/pedido/pedido-form.tsx`): rendered off-screen
   (`aria-hidden`, `tabIndex={-1}`), never visible or reachable to a
   real visitor. If it comes back non-empty, `submitPedidoAction`
   returns a **fake success** without touching the database at all —
   the bot doesn't learn its submission was rejected.
3. **The request's `kind` (ORDER/QUOTE) is never trusted from the
   client** — `publicPedidoSchema` doesn't even accept the field;
   `createPublicPedido` derives it server-side from whether `size` is
   present, so a tampered hidden field can't misclassify a submission.

Everything past the public submission step (claiming, cancelling,
releasing, converting to a sale) goes through the normal
session-checked Server Action pattern — only the initial anonymous
write is special-cased.

## Notification system (pedido bell, phase 10)

The dashboard header's bell (`components/pedido-badge.tsx` +
`components/pedido-notifications.tsx`) is the first notification
mechanism in this app. Deliberately simple — no websockets/SSE/push
service, per CLAUDE.md section 1 — built from three pieces:

1. **Server-rendered initial list**: `components/pedido-badge.tsx` (a
   Server Component, mounted in `app/[locale]/(dashboard)/layout.tsx`'s
   header) reads the session and calls `listPedidoNotifications`
   (`lib/pedidos.ts`) — up to 20 `PENDING` requests, scoped to the
   viewer's own city unless they're an admin (same scoping rule as
   claiming, `03-roles-permissions.md`), newest first. This avoids a
   flash of "no notifications" on first paint.
2. **Client-side polling for freshness**: `PedidoNotifications`
   (`components/pedido-notifications.tsx`, a Client Component) takes
   that initial list as a prop, then every 60 seconds calls
   `getPedidoNotificationsAction` (`lib/actions/pedidos.ts`) — a normal,
   session-checked Server Action — and replaces its in-memory list with
   the fresh result. A request naturally drops off the list the moment
   anyone claims, cancels, or converts it (the query only ever selects
   `status: "PENDING"`), so no extra "remove this notification" call is
   needed for that case.
3. **Per-browser dismissal via `localStorage`**: clicking a notification
   navigates to `/pedidos/[id]` (the request's detail page) *and* adds
   its id to a `Set` persisted at
   `localStorage["ema:dismissedPedidoNotifications:{userId}"]`. The
   bell's badge count and dropdown list are always `items.filter(item
   => !dismissed.has(item.id))` — so a dismissed request disappears
   from *that person's* bell immediately and stays gone across reloads
   on that browser, **without changing the request's actual `status`**.
   It still shows up for every other eligible seller/admin, and for
   this same user again if they open a different browser/device — this
   is a convenience marker, not a database column, exactly like the
   "phase 10 out of scope" note in `04-scope-mvp.md` says. On every poll
   tick, the dismissed set is pruned down to only the ids still present
   in the fresh server list (so it can't grow forever once a request is
   claimed/converted and drops out of the feed for good).

The bell itself renders nothing (`return null`) once the filtered list
is empty — there's no "0 notifications" empty state to design for.

If a future phase needs true cross-device "seen" state (e.g. a manager
checking from two computers and expecting dismissals to follow them),
that would mean adding a persisted per-user "last seen" timestamp or a
seen-by join table — a deliberate scope decision, not an oversight of
the current design.

## Environment variables

Document every required variable in `.env.example` (never commit `.env`):
`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `CRON_SECRET`.
