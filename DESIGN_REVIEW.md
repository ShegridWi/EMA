# EMA — Design Review (pre-refactor)

Scope: review of current UI implementation against the requirements in
`.claude/README.md` §§0–1 (responsive, theming via `UserSettings`, Tailwind
conventions, icon system, motion). No code changed in this pass — this is
the review to sign off before Phase 1 (skills) / Phase 4 (refactor) begin.

Stack confirmed: Next.js 16 App Router, Tailwind v4 (`@import "tailwindcss"`
in `app/globals.css`, no `tailwind.config.*` — v4's CSS-first config), no
`shadcn/ui`, no icon library, `next-themes` for theme application.

## 1. Component inventory

**Pages** (`app/[locale]/...`, 20 files) — login; dashboard home; materials
list/new/edit/history; products list/new/new-set/edit/history; sales
list/new; users list/new/edit; movement-log; reports; settings. All are
Server Components that fetch data and compose client form/action
components.

**Shared components** (`components/`, 22 files):
- `ui/`: `theme-provider.tsx`, `theme-toggle.tsx`, `prompt-modal.tsx` (native
  `<dialog>`-based confirm/prompt), `toast-provider.tsx` (success/error/
  warning toasts).
- `dashboard-nav.tsx` — sidebar link list.
- `login-form.tsx`.
- Per-entity form/action components under `materials/`, `products/`,
  `sales/`, `users/`, `settings/` (create/edit forms, deactivate/reactivate/
  delete buttons, sale return/void actions).
- `reports/report-document.tsx` — PDF layout (react-pdf, styled with its own
  StyleSheet API, **out of scope** for a Tailwind refactor by definition).

The good news for the refactor: these ~20 form/list components are
**extremely uniform**. The same literal class strings repeat nearly
verbatim across all of them (counts from a repo-wide grep):

- `border-zinc-300 ... dark:border-zinc-700` — input/select/textarea/button
  borders, used in essentially every form field, in **21 different files**.
- `bg-zinc-900 ... dark:bg-zinc-50 ... text-zinc-50 ... dark:text-zinc-900`
  — the one "primary button" style, repeated in every form and every list
  page's "add new" link.
- `text-zinc-500 ... dark:text-zinc-400` — the one "muted text" style
  (empty states, helper text, secondary labels).
- `text-red-600 ... dark:text-red-400` — the one "error text" style.

This means there is effectively already one de-facto design system, just
expressed as copy-pasted utility strings instead of shared components or
tokens. That makes this a low-risk, mechanical-ish refactor: extract ~5–6
shared primitives (`Button`, `Input`/`Select`/`Textarea`, `Card`/`Panel`,
muted `Text`, error `Alert`) and the token substitution below, and the vast
majority of the 21 files fall in line automatically.

## 2. Theming — how it works today

Better wired than the README's warning suggested, but incomplete on the
styling side:

- **Source of truth is already `UserSettings.theme`**, not just OS
  preference: `app/[locale]/layout.tsx:34-66` reads the session's
  `settings.theme` server-side and passes it as `next-themes`'
  `defaultTheme`, with `attribute="class"` (so `<html class="dark">`) and
  `enableSystem` as the fallback when a session/setting is absent (e.g. the
  login page). This is correct and should **not** be redone from scratch —
  it satisfies "no session falls back to system" and "`UserSettings` is the
  source of truth" already.
- `components/settings/settings-form.tsx:63-69` calls `setTheme(...)`
  immediately after a successful save, so the toggle-vs-saved-preference
  path (manual `ThemeToggle` override vs. the persisted setting) is already
  reconciled — worth preserving exactly as-is, just documenting it in the
  `theming-user-settings` skill.
- **What's missing**: `app/globals.css` only defines two raw tokens,
  `--background`/`--foreground` (Next's default starter values, `#ffffff`/
  `#171717` light, `#0a0a0a`/`#ededed` dark via `@media
  (prefers-color-scheme)` — **not** even gated by the `dark` class next-themes
  applies, so this block is currently dead weight once JS adds the class).
  No `primary`/`secondary`/`accent`/`muted` tokens exist. Every component
  instead hardcodes Tailwind's stock `zinc`/`red`/`green`/`amber` palettes
  with manual `dark:` variants (see §1 counts) — functionally fine (theme
  switch works, since `dark:` responds to the `dark` class) but it means
  none of the components use the brand palette in `.claude/README.md` §3,
  and every color decision is duplicated per-file instead of centralized.

**Refactor implication**: keep the `UserSettings` → `next-themes`
`class`-attribute wiring untouched; replace the `--background`/
`--foreground` stub and the scattered `zinc-*`/`red-*`/`green-*`/`amber-*`
utility literals with the semantic `@theme` tokens from README §3
(`background`, `foreground`, `primary`, `secondary`/`accent`,
`muted-foreground`), mapped to the supplied light/dark hex pairs. Toast
success/error/warning colors need their own semantic tokens too (e.g.
`success`/`danger`/`warning`) since they're currently green/red/amber
literals, not part of the suggested 5-token palette — worth flagging in the
`theming-user-settings` skill rather than silently forcing them onto
`primary`/`accent`.

## 3. Responsiveness

**No responsive breakpoint utility (`sm:`/`md:`/`lg:`/`xl:`/`2xl:`) exists
anywhere in the codebase** — confirmed by a repo-wide grep across every
`.tsx` file, zero hits. Concretely:

- `app/[locale]/(dashboard)/layout.tsx:29-49` — fixed-width `w-56` sidebar
  (`components/dashboard-nav.tsx:26`) rendered unconditionally alongside
  `main`, no hamburger/drawer/collapse for mobile. On a 375px viewport the
  sidebar (224px) leaves ~150px for content — unusable.
- List pages wrap tables in `overflow-x-auto` with a `min-w-[720px]` table
  (e.g. `app/[locale]/(dashboard)/inventory/materials/page.tsx:146-147`) —
  the one concession to small screens that already exists today, but it's
  a horizontal-scroll escape hatch, not a responsive layout (no card/stacked
  view at mobile widths).
- Forms are hardcoded to `max-w-md` / `max-w-sm` (fine at all widths, but no
  `sm:`/`lg:` adjustments for input sizing, label placement, or button
  layout).
- `header` in the dashboard layout uses a single fixed `px-4 py-3` — no
  scaling for larger screens, and the sign-out/theme-toggle cluster would
  compete for space with a mobile nav trigger once one is added.

**Refactor implication**: this is the single biggest gap relative to
README §1 ("responsive mobile-first en todos los componentes"). Priority
should be: (1) collapsible/drawer nav for `<lg`, (2) a stacked-card
alternative or better-considered horizontal scroll for the 6 data tables,
(3) sweep spacing/typography for mobile-first scaling once the shared
`Button`/`Input` primitives exist (so the fix happens once, not in 21
files).

## 4. Icon system

**None exists.** No `lucide-react`, `heroicons`, `react-icons`, or any
icon package in `package.json` or `node_modules`; grep for common icon
import patterns across the repo returns nothing. All affordances today are
text links (`underline` styled `<Link>`/`<button>`) — e.g. edit/delete/
history actions in the materials/products/users list rows
(`app/[locale]/(dashboard)/inventory/materials/page.tsx:176-199`), the "×"
glyph dismiss button in `ToastProvider`
(`components/ui/toast-provider.tsx:112`), theme toggle showing the word
"light"/"dark" instead of a sun/moon icon.

**Refactor implication**: green field — no migration/replacement risk,
just additive. `lucide-react` per README §4 is a good fit (tree-shakeable,
inherits `currentColor` so it auto-follows the semantic text tokens from
§2). Highest-value first targets: toast dismiss (×), theme toggle
(sun/moon), table row actions (pencil/trash/history/power icons instead of
underlined words — also improves scannability on narrow table columns),
nav links, form field affordances (search input, calendar for date
fields).

## 5. Animations / transitions

**None exist.** Grep for `transition|animate-|duration-|ease-` across every
`.tsx` returns zero matches. Concretely missing:

- Theme switch: `class` toggles instantly, no `transition-colors` on
  `background`/`border`/`text` anywhere, so light↔dark flips abruptly.
- `PromptModal` (`components/ui/prompt-modal.tsx`): uses the native
  `<dialog>`/`showModal()` with no `::backdrop` or dialog transition — pops
  in/out instantly. (Native `<dialog>` *can* be animated via the
  `@starting-style`/`allow-discrete` pattern without extra JS — worth
  covering in the `motion-and-transitions` skill as the concrete recipe for
  this exact component.)
- `ToastProvider` (`components/ui/toast-provider.tsx`): toasts appear/
  disappear from the DOM with no enter/exit transition (react state array
  splice — a toast just vanishes at the 3s mark).
- Hover states exist (`hover:bg-zinc-100`, `hover:opacity-100`) but without
  `transition-colors`, so they also snap rather than ease.
- No loading/skeleton states — server components block on data fetch
  (acceptable for this app's scale) and the few client mutations use a
  `disabled` + label-swap pattern (e.g. `sale-form.tsx:370`
  `pending ? t("submitting") : t("submit")`) rather than a spinner — fine
  functionally, but no `animate-spin` icon exists to pair with it once
  icons are added.

**Refactor implication**: additive, low-risk. Standardize on one
`transition-colors duration-200 ease-in-out` utility for theme-affected
surfaces, add real enter/exit transitions to `PromptModal` and toasts
(these are the two components users will notice most), respect
`prefers-reduced-motion` per README, and pair the new spinner/pending
states with a `lucide` icon once available.

## 6. Prioritized refactor plan

1. **Tokens first** (`app/globals.css` `@theme` block): add the semantic
   palette from README §3, gated correctly on the `dark` class (fixing the
   currently-dead `prefers-color-scheme` block), plus `success`/`danger`/
   `warning` tokens for toasts. Nothing else should start until this
   lands, since every other step consumes these tokens.
2. **Extract shared primitives**: `Button` (primary/secondary/ghost/danger
   variants — replaces the repeated `bg-zinc-900 dark:bg-zinc-50...` string
   and the underlined-text action links), `Input`/`Select`/`Textarea`
   (replaces the repeated `border-zinc-300 dark:border-zinc-700...`
   string), `FormField` (label + control + error, replaces the
   `flex flex-col gap-1` wrapper repeated in every field of every form),
   `Card`/`Panel`, muted `Text`, `Alert`. Given §1's finding, this should
   collapse ~90% of the by-hand `zinc-*`/`red-*` occurrences immediately.
3. **Icons**: install `lucide-react`, wire into `ToastProvider`,
   `ThemeToggle`, table row actions, nav — additive, no breakage risk.
4. **Responsiveness**: mobile nav (drawer/hamburger) first since it's the
   only genuinely broken layout at 375px; then table→card treatment for
   the 6 list pages; then a spacing/breakpoint sweep, which should be cheap
   once primitives exist.
5. **Motion**: add `transition-colors` to themed surfaces, real
   open/close transitions for `PromptModal` and `ToastProvider`,
   `prefers-reduced-motion` guard — last, since it's polish on top of
   stable markup from steps 2–4.

Each step should land with a manual check at ~375px / ~768px / ~1280px per
README §5, and a full light/dark toggle pass to confirm no component keeps
stale colors after the tokens land (should be structurally guaranteed once
step 1+2 remove the last hardcoded `zinc-*`/`red-*` literal).

## 7. Open questions for the business/product owner before Phase 4 starts

- Toast success/error/warning currently use Tailwind's stock green/red/
  amber — the README's 5-token palette has no obvious slot for these.
  Recommend adding 3 dedicated semantic tokens rather than forcing them
  onto `primary`/`accent`; flag for confirmation since it's a deviation
  from the literal table in README §3.
- `report-document.tsx` (react-pdf) is explicitly out of scope for a
  Tailwind-token refactor (react-pdf has its own styling API) — confirm
  that's understood/acceptable, or whether its colors should still be kept
  in sync with the brand palette by hand.
