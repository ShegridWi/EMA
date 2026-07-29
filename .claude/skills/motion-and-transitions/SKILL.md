---
name: motion-and-transitions
description: framer-motion is the standard animation library for this project — durations/easing, which UI elements should animate (theme changes, modals, hover/focus, loading states) versus which shouldn't, and the prefers-reduced-motion rule. Use whenever adding a transition/animation or reviewing motion in a component.
---

# motion-and-transitions

Before this refactor, the project had **zero** animation anywhere
(confirmed in `DESIGN_REVIEW.md` §5) — theme switches, hovers, and the
modal/toast components all snap instantly. `framer-motion` is the
project's chosen animation library for any real orchestrated animation
(mount/unmount, enter/exit, gesture-driven motion) — install it with
`npm install framer-motion` if not already present.

## Division of labor: framer-motion vs. plain Tailwind transitions

Don't reach for `framer-motion` for *everything* — that's more machinery
than a single-property hover state needs:

- **Plain Tailwind `transition-*` utilities**: single CSS-property
  changes with no mount/unmount involved — color/background changes on
  theme switch, `hover:`/`focus:` states. These stay as
  `transition-colors duration-200 ease-in-out` (or `transition-opacity`
  for opacity-only hovers) directly in the component's className.
- **`framer-motion`**: anything with an enter/exit lifecycle or that
  needs to orchestrate multiple animated values together — `PromptModal`
  open/close, `ToastProvider` items mounting/unmounting, any future
  drawer/collapsible nav. Use `motion.div` + `AnimatePresence` for these,
  not hand-rolled CSS keyframes or the `@starting-style`/`allow-discrete`
  CSS pattern.

## Standard durations and easing

Use exactly these values project-wide — don't invent a third:

- **Tailwind color transitions**: `duration-200 ease-in-out`.
- **framer-motion transitions**: `{ duration: 0.2, ease: "easeOut" }` for
  entrances, `{ duration: 0.15, ease: "easeIn" }` for exits (exits should
  feel slightly quicker than entrances — standard motion-design
  convention). Define these once as shared constants (e.g.
  `lib/motion.ts` exporting `ENTER_TRANSITION`/`EXIT_TRANSITION`) and
  import them everywhere `framer-motion` is used, rather than repeating
  the numbers per component.

Don't reach for arbitrary duration values — `150`/`200`ms covers every
case in this app.

## What should animate

- **Theme changes**: every element carrying a semantic color token
  (`bg-background`, `text-foreground`, `border-border`, etc. — see
  [[theming-user-settings]]) should have `transition-colors duration-200
  ease-in-out` so a theme toggle fades rather than snaps. Plain Tailwind,
  not `framer-motion` (no mount/unmount here). Apply this once, broadly
  (e.g. on `body` and on the shared `Button`/`Input` primitives from
  [[tailwind-conventions]]), not sprinkled per-component.

- **`PromptModal`** (`components/ui/prompt-modal.tsx`): keep the native
  `<dialog>` + `showModal()`/`close()` — it's the simplest way to get a
  real focus trap, `Escape`-to-close, and top-layer stacking for free
  (CLAUDE.md's "prefer simple, low-maintenance solutions"), and
  `framer-motion` doesn't replace that accessibility machinery. Animate
  the **panel content** inside the dialog with a `motion.div` instead of
  animating the `<dialog>` element itself:

  ```tsx
  import { motion } from "framer-motion";

  <motion.div
    initial={false}
    animate={open ? "visible" : "hidden"}
    variants={{
      visible: { opacity: 1, scale: 1 },
      hidden: { opacity: 0, scale: 0.95 },
    }}
    transition={open ? ENTER_TRANSITION : EXIT_TRANSITION}
    onAnimationComplete={(variant) => {
      // Only actually close the native <dialog> once the exit
      // animation has finished playing — otherwise it'd vanish
      // instantly the moment `open` flips to false.
      if (variant === "hidden") dialogRef.current?.close();
    }}
  >
    {/* form content */}
  </motion.div>
  ```

  The existing `useEffect` that calls `dialog.showModal()` when `open`
  becomes `true` is unaffected — only the `close()` call moves from that
  effect into `onAnimationComplete` for the closing case. Animate the
  `::backdrop` with a plain CSS `transition-opacity` (framer-motion can't
  reach a pseudo-element) — a simple opacity fade is enough there.

- **`ToastProvider`** (`components/ui/toast-provider.tsx`): wrap the
  toast list in `<AnimatePresence>` and render each `ToastItem` as a
  `motion.div` with `initial={{ opacity: 0, x: 16 }}`,
  `animate={{ opacity: 1, x: 0 }}`, `exit={{ opacity: 0, x: 16 }}` — this
  is the canonical `AnimatePresence` use case (a real unmount from the
  `toasts` array triggers the exit animation automatically, no manual
  "leaving" state needed, unlike a plain CSS approach).

- **Hover/focus states — mandatory on every interactive element**: every
  clickable element (button, action link, nav item, table row action)
  must have a hover state, and that hover state must be paired with
  `transition-colors duration-200 ease-in-out` (or `transition-opacity`)
  — plain Tailwind, no `framer-motion` needed. This isn't limited to
  elements that already have a `hover:` class today (those currently snap
  instead of easing) — it applies to every interactive element touched
  during the Phase 4 refactor, including ones with no hover treatment at
  all yet. See [[tailwind-conventions]] for the paired `cursor-pointer`
  rule — the two go together: no clickable element should be missing
  either.

- **Loading/pending states**: pair the existing `disabled` + label-swap
  pattern (e.g. `sale-form.tsx`'s `pending ? t("submitting") : t("submit")`)
  with `<Loader2 className="size-4 animate-spin" />` (see
  [[icon-system]]) — Tailwind's built-in `animate-spin` keyframe is
  sufficient for a continuous spinner, no need for `framer-motion` here.

## What should NOT animate

- Table rows/list content on initial render (server-rendered, no
  client-side mount animation — don't add one, it delays perceived load).
- Form field focus rings beyond the default browser/Tailwind
  `focus-visible` treatment — don't add elaborate focus animations to
  inputs.
- Anything the user hasn't asked to see move twice — don't animate
  page-level layout (nav width changes, main content reflow) just because
  `framer-motion` is available. Motion here is for **feedback on state
  change** (theme, open/close, hover, loading), not decoration.

## `prefers-reduced-motion`

- **framer-motion components**: use the library's own
  `useReducedMotion()` hook and branch the `transition`/`variants` to a
  no-op (zero duration, or skip the transform entirely) when it returns
  `true`. This is the correct mechanism for anything animated via
  `motion.*` — a blanket CSS override won't reliably reach values set
  through framer-motion's animation engine.
- **Plain Tailwind transitions** (theme/hover color changes): a global
  CSS override in `app/globals.css` is enough, since these are ordinary
  CSS transitions:

  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
    }
  }
  ```

  Color transitions (theme switch) are a11y-safe to leave running even
  under reduced motion since they don't involve movement, but the blanket
  rule above is simpler than special-casing — keep it unless it causes a
  visible regression on the theme-switch fade.
