---
name: icon-system
description: The icon library used in this project (lucide-react), sizing/stroke-width conventions, and import rules. Use whenever adding, replacing, or reviewing any icon in the UI.
---

# icon-system

Before this refactor, the project had **no icon library at all** — every
affordance was underlined text (confirmed in `DESIGN_REVIEW.md` §4). This
is a green-field addition, not a migration, so there's no legacy icon
usage to reconcile.

## Library: `lucide-react`

Chosen per `.claude/README.md` §4:
- 1500+ icons, one consistent stroke-based style.
- Tree-shakeable — each icon is its own import, no monolithic bundle.
- Icons default to `currentColor`, so they automatically pick up whatever
  text-color token (`text-foreground`, `text-primary`,
  `text-muted-foreground`, etc. — see [[theming-user-settings]]) is set on
  an ancestor or the icon itself, with zero extra theming work.

Install with `npm install lucide-react` if not already present in
`package.json`.

## Import convention

Import each icon by name directly from `lucide-react` — never a wildcard/
namespace import (defeats tree-shaking):

```tsx
// Good
import { Pencil, Trash2, Sun, Moon } from "lucide-react";

// Bad — pulls in far more than tree-shaking can help with
import * as Icons from "lucide-react";
```

## Sizing convention

Use Tailwind's `size-*` utility (sets both width and height) rather than
separate `h-*`/`w-*`:

| Context | Class | Example use |
|---|---|---|
| Inline with body/label text | `size-4` | icon inside a form hint |
| Buttons, table row actions | `size-5` | edit/delete/history icons in list rows |
| Nav items, header icons | `size-5` | `DashboardNav` links, theme toggle |
| Page/section headers, empty states | `size-6` | larger standalone icons |

Don't hand-pick arbitrary pixel sizes — pick from this table based on
context, matching the [[tailwind-conventions]] rule against arbitrary
values.

## Stroke width

Use the library default (`strokeWidth={2}`, lucide's default) everywhere.
Only override to `strokeWidth={1.5}` for the larger (`size-6`+)
standalone/decorative uses where the default can look slightly heavy —
never mix stroke widths within the same row/toolbar of icons.

## Color

Never pass an explicit `color` prop or wrap an icon in a raw palette
class. Icons inherit `currentColor`, so set color via the semantic text
token on the icon or its wrapper (`text-danger`, `text-muted-foreground`,
`text-primary-foreground` when on a filled button, etc. — see
[[theming-user-settings]]).

```tsx
// Good — icon follows the semantic danger token, both themes handled
<Trash2 className="size-5 text-danger" />

// Bad — hardcoded color, doesn't respond to theme
<Trash2 className="size-5" color="#dc2626" />
```

## Where to apply first (from `DESIGN_REVIEW.md` §4)

Highest-value initial targets, in priority order:
1. `components/ui/toast-provider.tsx` — replace the literal `×` dismiss
   glyph with `X`.
2. `components/ui/theme-toggle.tsx` — `Sun`/`Moon` instead of the text
   label (keep the `aria-label` for accessibility).
3. Table row actions (materials/products/users list pages) — `Pencil`
   (edit), `Trash2` (delete), `History` (history link), `Power`/
   `PowerOff` (deactivate/reactivate) instead of underlined words.
4. `components/dashboard-nav.tsx` — one icon per nav link.
5. Form affordances — `Search` in the sale form's product search input,
   loading spinner (`Loader2` with `animate-spin`, see
   [[motion-and-transitions]]) for pending submit states.

Always keep an accompanying text label or `aria-label` alongside an icon —
icons here are meant to improve scannability, not to replace meaning for
screen reader users.
