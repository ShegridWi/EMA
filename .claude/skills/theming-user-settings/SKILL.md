---
name: theming-user-settings
description: How the light/dark theme is sourced from UserSettings and applied via next-themes, plus the semantic color tokens for both themes defined in app/globals.css's @theme block. Use whenever adding a new color, touching theme-related code, or reviewing whether a component follows the token system.
---

# theming-user-settings

`UserSettings.theme` (Prisma enum `Theme.LIGHT | Theme.DARK`) is the
**source of truth** for which theme a signed-in user sees — not the OS
`prefers-color-scheme`. This wiring already exists correctly (confirmed in
`DESIGN_REVIEW.md` §2) — **do not rebuild it**. This skill documents how it
works and the token palette that plugs into it.

## How the preference reaches the DOM

1. `app/[locale]/layout.tsx` calls `auth()` server-side and reads
   `session.user.settings.theme`, lower-cased, as the `defaultTheme` passed
   to `<ThemeProvider attribute="class" defaultTheme={...} enableSystem>`
   (`components/ui/theme-provider.tsx` wraps `next-themes`).
2. `next-themes` applies the resulting theme as a class on `<html>`
   (`attribute="class"` → `<html class="dark">` or no class for light) —
   this is what every `dark:` Tailwind variant and semantic-token
   `@theme` resolution key off.
3. `enableSystem` is the fallback **only** when there's no session/setting
   (e.g. the login page) — a signed-in user's saved preference always
   wins over OS preference once they're authenticated.
4. `components/ui/theme-toggle.tsx` lets a user override the theme for the
   current browser via `next-themes`' own `setTheme()`/localStorage — this
   does **not** persist to `UserSettings` by itself.
5. `components/settings/settings-form.tsx` is the one place that persists a
   theme choice to `UserSettings` (via `updateUserSettingsAction` →
   `lib/user-settings.ts`'s `updateUserSettings`), and immediately calls
   `setTheme(saved.theme.toLowerCase())` so the change applies instantly in
   the same tab instead of waiting for the next login.

**When adding any new theme-related code**: it must read/write through
this same path (`UserSettings` as the persisted source of truth,
`next-themes` as the DOM-application mechanism). Never introduce a second
theme state (e.g. a separate cookie, a new context) — extend this one.

## Semantic color tokens

**`app/globals.css`'s `@theme` block is the single centralized location
for every color value in the app — no exceptions.** Every component
consumes a color exclusively as `bg-background`, `text-foreground`,
`bg-primary`, `text-primary-foreground`, `border-border`, etc. (see
[[tailwind-conventions]] for the "always use the token, never the raw
palette class, never a second color source" rule). Never hardcode a hex
value or a raw Tailwind palette class (`zinc-300`, `#ff715b`) inside a
component, and never declare a color anywhere outside this one block
(no second `@theme`, no inline `style`, no per-component CSS module, no
hex literal in a TS lookup table) — add or adjust a token here instead.

### Palette source and rationale

Base colors requested by the business (`.claude/README.md` §3), mapped to
semantic roles:

| Token | Light value | Dark value |
|---|---|---|
| `background` | `#ffffff` (white) | `#031926` (ink-black) |
| `foreground` | `#523f38` (deep-mocha) | `#f4e9cd` (vanilla-cream) |
| `muted-foreground` | `#4c5454` (iron-grey) | `#9dbebb` (ash-grey) |
| `primary` | `#ff715b` (vibrant-coral) | `#468189` (teal) |
| `secondary` / `accent` | `#1ea896` (verdigris) | `#77aca2` (muted-teal) |

These 5 pairs come directly from the business's requested palette and
should not be changed without checking with the business first.

### Tokens added beyond the requested 5 (needed for real components)

The requested palette covers text/surface/brand roles but not everything
21 files worth of existing components actually need. These were added
during the refactor, derived from the existing (Tailwind-stock) colors
they replace — **flagged for business confirmation** per
`DESIGN_REVIEW.md` §7, since they're a deviation from the literal
5-token table:

| Token | Replaces | Light | Dark |
|---|---|---|---|
| `border` | `zinc-300` / `zinc-700` | `#d4d4d8` | `#3f3f46` |
| `muted` | `zinc-100` / `zinc-900` (hover/surface bg) | `#f4f4f5` | `#18181b` |
| `primary-foreground` | text painted on `bg-primary` | `#ffffff` | `#ffffff` |
| `secondary-foreground` | text painted on `bg-secondary` | `#ffffff` | `#031926` |
| `success` | `green-600` / `green-500` | `#16a34a` | `#22c55e` |
| `success-foreground` | text on `bg-success` | `#ffffff` | `#052e12` |
| `danger` | `red-600` / `red-400` | `#dc2626` | `#f87171` |
| `danger-foreground` | text on `bg-danger` | `#ffffff` | `#450a0a` |
| `warning` | `amber-600` / `amber-500` | `#d97706` | `#f59e0b` |
| `warning-foreground` | text on `bg-warning` | `#ffffff` | `#451a03` |
| `ring` | focus ring | same as `primary` | same as `primary` |

### `@theme` block shape (Tailwind v4)

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #523f38;
  --muted: #f4f4f5;
  --muted-foreground: #4c5454;
  --border: #d4d4d8;
  --primary: #ff715b;
  --primary-foreground: #ffffff;
  --secondary: #1ea896;
  --secondary-foreground: #ffffff;
  --success: #16a34a;
  --success-foreground: #ffffff;
  --danger: #dc2626;
  --danger-foreground: #ffffff;
  --warning: #d97706;
  --warning-foreground: #ffffff;
  --ring: var(--primary);
}

.dark {
  --background: #031926;
  --foreground: #f4e9cd;
  --muted: #18181b;
  --muted-foreground: #9dbebb;
  --border: #3f3f46;
  --primary: #468189;
  --primary-foreground: #ffffff;
  --secondary: #77aca2;
  --secondary-foreground: #031926;
  --success: #22c55e;
  --success-foreground: #052e12;
  --danger: #f87171;
  --danger-foreground: #450a0a;
  --warning: #f59e0b;
  --warning-foreground: #451a03;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-danger: var(--danger);
  --color-danger-foreground: var(--danger-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-ring: var(--ring);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

Note the theme selector is `.dark` (a plain class), matching `next-themes`'
`attribute="class"` — **not** `@media (prefers-color-scheme)`. The
project's previous globals.css had the color overrides inside a
`prefers-color-scheme` media query, which never actually responded to the
`dark` class `next-themes` applies — that was dead code and must not be
reintroduced.

### Contrast note (WCAG AA)

`primary` (`#ff715b` light / `#468189` dark) and `secondary`
(`#1ea896` light / `#77aca2` dark) do **not** reliably hit 4.5:1 against
`background` at small text sizes — they're intended for **button
surfaces, icons, and large/bold text**, always paired with their matching
`-foreground` token, never as small body text color directly on
`background`. `foreground`/`muted-foreground` against `background` are the
pairs to use for body copy in both themes. If a future color addition
fails AA contrast for its intended use, adjust the mapping and document
the deviation here rather than shipping it silently (per
`.claude/README.md` §3's explicit instruction to prioritize legibility
over the literal suggested mapping).

## Form controls: always set explicit background + text color, never `bg-transparent` alone

**Hard rule**: every `<input>`, `<select>`, and `<textarea>` must set
`bg-background text-foreground` explicitly (in addition to
`border-border`) — never just `bg-transparent` relying on an inherited
text color. A repo-wide grep at the time this rule was added found **67
occurrences of `bg-transparent`** across every form/filter input and
**24 `<select>` elements**, none of them setting an explicit text color.

This is the concrete cause of the "can't distinguish the dropdown text"
bug: a `<select>` styled with `bg-transparent` inherits `text-foreground`
from its ancestor for the closed control, but the **open dropdown
list/`<option>` popup is rendered by the OS/browser itself in many
desktop browsers**, not by this app's CSS — Chrome/Firefox/Edge on
Windows in particular often render that popup with an OS-native white (or
OS-theme) background regardless of the page's dark mode, while still
partially honoring the inherited text color. The result: light/cream
`foreground` text (correct for a dark `background`) lands on a
white-ish OS popup background, and becomes hard or impossible to read.

**Mitigation** (do this for every input/select/textarea, not just ones
that visibly break):

```tsx
// Bad — bg-transparent + no explicit text color; breaks in the exact
// way described above once the OS renders its own dropdown background
<select className="rounded-md border border-border bg-transparent px-3 py-2">

// Good — explicit surface + text color on the control itself
<select className="rounded-md border border-border bg-background px-3 py-2 text-foreground">
```

**Known limitation, not fully fixable with CSS alone**: some
browser/OS combinations still render the *open* `<option>` list with
OS-controlled colors that page CSS cannot override at all (this is a
long-standing native `<select>` limitation, not specific to this
project). `bg-background text-foreground` on the `<select>` itself fixes
the closed control and is enough for the common cases, but if a specific
browser/OS combination is still reported as unreadable when the dropdown
is *open*, the only full fix is replacing that native `<select>` with a
custom-built listbox (e.g. a headless combobox pattern) — treat that as a
separate, explicitly-scoped follow-up if it comes up, not something to
solve preemptively across all 24 selects.

### `<input type="date">`'s native calendar icon/popup: use `color-scheme`, not a color token

The date picker icon and its popup are rendered by the browser outside
the DOM — no `bg-*`/`text-*` utility reaches them, so the "explicit
background + text color" rule above doesn't apply here. The correct hook
is the CSS `color-scheme` property, set once in `app/globals.css`:

```css
input[type="date"] {
  color-scheme: light;
}
.dark input[type="date"] {
  color-scheme: dark;
}
```

This is why every `<input type="date">` in the app should go through the
`Input` primitive (`components/ui/input.tsx`) rather than a raw
`<input>` — the primitive doesn't need to do anything special for dates,
but relying on it keeps date inputs inside the same `.dark` selector
scoping as everything else instead of one being styled ad hoc. Don't
reach for a `filter: invert(...)` hack on
`::-webkit-calendar-picker-indicator` — `color-scheme` is the
standards-based fix (Chromium, Firefox, and Safari all honor it for
native form-control chrome) and also themes the popup itself, not just
the icon.

## Adding a new color in the future

1. Never add a literal hex or a raw Tailwind palette class in a component.
2. Add a new semantic token (both light and dark value) to this file's
   `@theme` table and to `app/globals.css`.
3. Check contrast against the `background`/`muted` it will realistically
   sit on; note the check here.
4. Consume it as `bg-<token>` / `text-<token>` / `border-<token>` — never
   re-derive it inline.
