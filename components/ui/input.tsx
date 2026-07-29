import { forwardRef, type InputHTMLAttributes } from "react";

// Explicit bg-background/text-foreground (never bg-transparent alone) —
// see .claude/skills/theming-user-settings/SKILL.md's "Form controls"
// rule for why. Fixed h-10 (not just py-2) so every field — text,
// select, date — lines up at exactly the same height regardless of the
// browser's own intrinsic sizing quirks for each input type (a <select>
// and an <input type="date"> don't render at the same height as a plain
// text input by default, even with identical padding).
const FIELD_CLASSES =
  "h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors duration-200 ease-in-out placeholder:text-muted-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => (
  <input ref={ref} className={`${FIELD_CLASSES} ${className}`} {...props} />
));
Input.displayName = "Input";
