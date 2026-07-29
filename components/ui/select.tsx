import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

// Same field treatment as Input (including the matching h-10 height),
// plus cursor-pointer + a hover state: unlike a text field, a <select>
// is an action trigger (opens a dropdown) — see
// .claude/skills/tailwind-conventions/SKILL.md's "Interactive elements"
// rule. `appearance-none` strips the browser's native arrow (which
// renders flush against the edge with no control over its spacing) so
// our own ChevronDown can take its place with proper padding — see the
// wrapper below.
const SELECT_CLASSES =
  "h-10 w-full cursor-pointer appearance-none rounded-md border border-border bg-background px-3 py-2 pr-9 text-sm text-foreground transition-colors duration-200 ease-in-out hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  // Defaults to true (fills its container, e.g. inside a FormField).
  // Set to false for an inline filter-row select that should size to
  // its content instead. This toggles a class on the *wrapper* div, not
  // the <select> itself — the <select> is always w-full of its wrapper,
  // so there's never a second width utility competing with it on the
  // same element (see the fullWidth doc comment history in git blame
  // for why that matters: a previous version tried overriding "w-full"
  // via `className="w-auto"` directly on <select>, which didn't
  // reliably win).
  fullWidth?: boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", fullWidth = true, ...props }, ref) => (
    <div className={`relative ${fullWidth ? "w-full" : "inline-block"}`}>
      <select
        ref={ref}
        className={`peer ${SELECT_CLASSES} ${className}`}
        {...props}
      />
      {/* peer-focus rotates the chevron 180° — the closest CSS-only
          proxy for "the dropdown is open" a native <select> exposes
          (there's no reliably-supported :open pseudo-class for it yet). */}
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground transition-transform duration-200 ease-in-out peer-focus:rotate-180" />
    </div>
  ),
);
Select.displayName = "Select";
