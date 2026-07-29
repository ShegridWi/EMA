---
name: tailwind-conventions
description: Tailwind CSS v4 conventions for this project — mobile-first breakpoints, spacing scale, semantic color tokens only (never raw hex/palette classes), and when to extract a shared component instead of repeating class strings. Use whenever writing or reviewing any component's className.
---

# tailwind-conventions

This project uses **Tailwind v4** (`@import "tailwindcss"` in
`app/globals.css`, CSS-first config via `@theme` — there is no
`tailwind.config.*` file, and none should be added). These are the
project's rules, not generic Tailwind advice — see `DESIGN_REVIEW.md` at
the repo root for the audit that produced them.

## Mobile-first, always

Write the unprefixed (mobile) classes first, then layer breakpoints up:
`sm:` (≥640px) → `md:` (≥768px) → `lg:` (≥1024px) → `xl:` (≥1280px) →
`2xl:` (≥1536px). Never design desktop-first and try to claw back mobile
with overrides.

```tsx
// Good — base case is mobile, sidebar only appears at lg+
<div className="flex flex-col lg:flex-row">

// Bad — assumes desktop, mobile is an afterthought
<div className="flex flex-row"> {/* no mobile fallback */}
```

As of this skill's creation, **zero files in the codebase use any
breakpoint prefix** (confirmed by repo-wide grep) — this is the single
biggest gap from `DESIGN_REVIEW.md` §3. The worst offender is
`components/dashboard-nav.tsx`'s fixed `w-56` sidebar rendered
unconditionally in `app/[locale]/(dashboard)/layout.tsx` — collapse it
into a mobile drawer/hamburger below `lg:` before touching anything else.

## Spacing scale

Use Tailwind's default spacing scale (multiples of `0.25rem` — `gap-1`,
`gap-2`, `gap-4`, `gap-6`, `p-2`, `p-3`, `p-6`, etc.) exclusively. Do not
introduce arbitrary values (`p-[13px]`, `gap-[7px]`) unless there is a
specific, commented reason (e.g. matching an external asset's fixed
dimension) — the existing forms already consistently use `gap-1` (label→
control) and `gap-4`/`gap-6` (field→field, section→section); keep matching
that rhythm rather than inventing new spacing values per component.

## Colors: one centralized source of truth, never per-component literals

**Hard rule**: every color value used anywhere in the app must be
declared in exactly one place — the `@theme` block in `app/globals.css`
(documented in full in [[theming-user-settings]]) — and every component
consumes it only through the semantic token utility Tailwind generates
from that block (`bg-primary`, `text-foreground`, `border-border`, ...).
No other file may declare a color. Concretely, this means:

- **Never write a raw Tailwind palette class** (`zinc-300`, `red-600`,
  `green-50`) or a raw hex in an arbitrary value (`bg-[#ff715b]`) inside a
  component. `DESIGN_REVIEW.md` §1–2 found the exact same
  `border-zinc-300 ... dark:border-zinc-700` and
  `bg-zinc-900 ... dark:bg-zinc-50 ... text-zinc-50 ... dark:text-zinc-900`
  strings copy-pasted across 21 files — that's the pattern being retired.
- **Never define a second color source** — no per-component `<style>`
  block, no inline `style={{ color: "#..." }}`, no a second `@theme` or
  CSS-variable block in another file, no color literal inside a Server
  Component's TS/TSX (e.g. a status→hex lookup object). If a component
  needs a color decision (e.g. "which color represents a `SaleType`"), it
  must map to one of the existing semantic tokens, not introduce a new
  literal.
- **A new color always means a new token first.** If none of the existing
  semantic tokens fit, add the token (light + dark value) to
  `app/globals.css`'s `@theme` block per the steps in
  [[theming-user-settings]] — never reach for a one-off literal as a
  shortcut, even for something that feels component-local (a single
  badge, a single chart color). Centralization only holds if there are no
  exceptions.

Instead, use the semantic tokens defined once in `app/globals.css`'s
`@theme` block (full palette and rationale in the
[[theming-user-settings]] skill):

| Instead of writing... | Write... |
|---|---|
| `border-zinc-300 dark:border-zinc-700` | `border-border` |
| `bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900` | `bg-primary text-primary-foreground` |
| `text-zinc-500 dark:text-zinc-400` | `text-muted-foreground` |
| `text-red-600 dark:text-red-400` | `text-danger` |
| `border-green-600 bg-green-50 text-green-900 dark:...` | `border-success bg-success/10 text-success` |
| raw `bg-white` / `dark:bg-black` page backgrounds | `bg-background` |

Every token already carries its own light/dark resolution (see the
[[theming-user-settings]] skill for how) — **do not add a manual `dark:`
variant on top of a semantic token**. The `dark:` variant is only ever
used directly on a semantic-token utility if you're deliberately doing
something a token can't express (rare — justify it in a comment if so).
This project's answer to "`dark:` variants vs. pre-resolved tokens" is:
**tokens are the default, `dark:` is the escape hatch**, not the other way
around.

## Extract a component instead of repeating classes

If you're about to write a `className` string that already exists
elsewhere (or a close variant of one), stop and use/extend a shared
primitive instead of pasting the string again. Per `DESIGN_REVIEW.md` §1,
these primitives should exist under `components/ui/`:

- `Button` — variants: `primary`, `secondary`, `ghost`, `danger`. Replaces
  every hand-written primary-button string and the underlined `<button>`/
  `<Link>` action-link pattern (edit/delete/history links in list rows).
- `Input`, `Select`, `Textarea` — replaces the repeated
  `rounded-md border border-border bg-transparent px-3 py-2 ...` string
  that appears in essentially every form field today.
- `FormField` — label + control + error, wrapping the
  `flex flex-col gap-1` pattern repeated in every field of every form.
- `Card` / `Panel` — surfaces like the modal body, settings form container.
- `Alert` — the `role="alert"` validation-error paragraph pattern.

A one-off className combination used exactly once does **not** need a
component — three similar lines beats a premature abstraction. Extract
only what `DESIGN_REVIEW.md` already identified as repeated across files,
not speculatively.

## Interactive elements: always `cursor-pointer` + a hover state

**Hard rule**: every clickable element must have `cursor-pointer` in its
className and a hover state with a transition (see
[[motion-and-transitions]] for the exact `transition-colors duration-200
ease-in-out` treatment). This covers every `<button>`, every `<select>`
(clicking it opens a dropdown — it's an action trigger, not a text
field), and any custom clickable `<div>`/`<span>` with an `onClick`.
Native `<a>`/`Link` elements already get a pointer cursor from the
browser, but **`<button>` does not** — Tailwind's Preflight resets button
cursor to `default` to match modern browser behavior, so it never comes
for free and must be added explicitly every time. `<select>` cursor
behavior is inconsistent across browsers for the same reason — set it
explicitly rather than trusting the default.

A repo-wide grep at the time this rule was added found **zero** uses of
`cursor-pointer` anywhere — every `<button>` (submit buttons,
deactivate/delete/reactivate/return/void actions, the theme toggle,
search/filter submit buttons, dismiss buttons) and every `<select>`
(unit/city/role/size/payment-method dropdowns, the filter selects on
every list page) currently shows the default arrow cursor. Plain text
`<input>`/`<textarea>` fields are the one exception — leave those at the
browser's default text-caret (`cursor-text`) cursor, since they're not
action triggers. Fix every button and select touched during the Phase 4
refactor — don't just fix the ones that happen to get restyled for other
reasons, since a mix of pointer/non-pointer controls across the app reads
as a bug to users, not a style choice.

```tsx
// Bad — no pointer cursor (browser/Preflight default is `cursor: default`
// for <button>), no hover feedback
<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">

// Good
<button className="cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors duration-200 ease-in-out hover:bg-primary/90">

// Select — same rule, cursor-pointer + hover + transition
<select className="cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-foreground transition-colors duration-200 ease-in-out hover:border-primary">
```

Once the shared `Button`/`Select` primitives from the previous section
exist, bake `cursor-pointer` and the hover transition into them once so
every caller gets both automatically — this rule matters most for any
interactive element that *isn't* going through those primitives
(icon-only buttons, one-off clickable elements).

### Icon-only or icon-plus-text interactive elements

An icon inside a button/link automatically follows that element's text
color and hover transition (icons use `currentColor` — see
[[icon-system]]), so a `hover:text-primary transition-colors` on the
parent is enough for most cases and no separate animation is needed on
the `<svg>` itself. Reserve a dedicated icon-level animation for
icon-*only* controls where the icon *is* the entire clickable surface
(e.g. the theme toggle, the toast dismiss button) — for those, add a
subtle `hover:scale-110 transition-transform duration-200 ease-in-out` on
the icon (plain Tailwind is enough here; this is a single-property hover
effect, not an enter/exit case, so `framer-motion` isn't warranted per
[[motion-and-transitions]]'s division-of-labor rule).

## Layout patterns

Best practices for page/section structure, beyond the per-component
color/spacing/breakpoint rules above:

- **Standard page shell**: keep the existing
  `<div className="flex flex-col gap-6">` → header row
  (`flex items-center justify-between`) → filter form → content pattern
  already used by every list page — it's a reasonable convention, don't
  reinvent it per page. Apply [[tailwind-conventions]]'s mobile-first
  rule to the header row specifically: stack title/actions vertically
  below `sm:` (`flex-col sm:flex-row sm:items-center sm:justify-between`)
  rather than forcing them onto one cramped row on a narrow screen.
- **Constrain content width on large screens**: `main` in
  `app/[locale]/(dashboard)/layout.tsx` currently has no max-width, so
  content stretches edge-to-edge on an ultra-wide monitor. Add a
  `mx-auto w-full max-w-7xl` wrapper around `{children}` (or on `main`
  itself) so line lengths and table density stay readable at any viewport
  — this is a one-line fix with no other layout implications.
- **Dashboard shell is the nav's job, not `main`'s**: the sidebar-vs-
  content split (`components/dashboard-nav.tsx` +
  `app/[locale]/(dashboard)/layout.tsx`) should become a `flex`/`grid`
  that collapses the sidebar into a drawer below `lg:` (see
  `DESIGN_REVIEW.md` §3) — don't solve mobile nav by shrinking the
  sidebar's fixed `w-56`, replace the fixed-width-always approach with a
  breakpoint-conditional one (hidden + toggle button below `lg:`, static
  `lg:flex` sidebar above it).
- **Prefer `gap` over margin-based spacing** between sibling elements in
  a flex/grid container (already the norm in this codebase — keep doing
  it) — don't reintroduce `mb-4`/`mt-4` chains when a parent `gap-4`
  says the same thing once.
- **Forms**: the current `max-w-md` single-column form layout is fine on
  mobile, but on wider screens (`sm:`/`md:`) consider a two-column grid
  for short-answer fields (e.g. `grid grid-cols-1 gap-4 sm:grid-cols-2`
  for fields like quantity/unit or city/date pairs) so long forms
  (`SaleForm`, `SetProductForm`) don't force excessive scrolling on
  desktop — but don't force this pattern onto every form mechanically;
  apply it where a form actually has enough same-length fields to pair
  up sensibly.
- **Tables**: `overflow-x-auto` + `min-w-[...]` (today's pattern) is an
  acceptable baseline for admin-tool tables, but per `DESIGN_REVIEW.md`
  §3 the better mobile treatment below `md:` is a stacked card per row
  (each cell becomes a labeled line) rather than horizontal scroll —
  scope this per table during the Phase 4 refactor, it's more work than
  the other layout items above so don't block on it.

## Icons and motion

Covered in their own skills — see [[icon-system]] and
[[motion-and-transitions]]. Don't hand-roll icon markup or ad hoc
`transition-*` classes here; those skills own the conventions.
