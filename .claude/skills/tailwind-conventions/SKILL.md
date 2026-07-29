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

**Hard rule**: every clickable element — every `<button>`, every
custom clickable `<div>`/`<span>` with an `onClick`, every element acting
as an action trigger — must have `cursor-pointer` in its className, and
must have a hover state with a transition (see [[motion-and-transitions]]
for the exact `transition-colors duration-200 ease-in-out` treatment).
Native `<a>`/`Link` elements already get a pointer cursor from the
browser, but **`<button>` does not** — Tailwind's Preflight resets button
cursor to `default` to match modern browser behavior, so it never comes
for free and must be added explicitly every time.

A repo-wide grep at the time this rule was added found **zero** uses of
`cursor-pointer` anywhere — every `<button>` in the app (submit buttons,
deactivate/delete/reactivate/return/void actions, the theme toggle, the
search/filter submit buttons, dismiss buttons) currently shows the
default arrow cursor instead of a pointer. Fix this for every button
touched during the Phase 4 refactor — don't just fix the ones that
happen to get restyled for other reasons, since a mix of pointer/
non-pointer buttons across the app reads as a bug to users, not a style
choice.

```tsx
// Bad — no pointer cursor (browser/Preflight default is `cursor: default`
// for <button>), no hover feedback
<button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">

// Good
<button className="cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors duration-200 ease-in-out hover:bg-primary/90">
```

Once the shared `Button` primitive from the previous section exists, bake
`cursor-pointer` and the hover transition into it once so every caller
gets both automatically — this rule matters most for any interactive
element that *isn't* going through that primitive (icon-only buttons,
one-off clickable elements).

## Icons and motion

Covered in their own skills — see [[icon-system]] and
[[motion-and-transitions]]. Don't hand-roll icon markup or ad hoc
`transition-*` classes here; those skills own the conventions.
