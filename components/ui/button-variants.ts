// Shared style lookup for both Button (native <button>) and ButtonLink
// (next-intl Link styled the same way) — keeps the variant classes in one
// place instead of duplicating them across the two components.
// See .claude/skills/tailwind-conventions/SKILL.md's "Extract a component
// instead of repeating classes" + "Interactive elements" rules.
export type ButtonVariant = "primary" | "secondary" | "link" | "link-danger";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "px-4 py-2 border border-border bg-background text-foreground hover:bg-muted",
  link: "text-foreground underline hover:text-primary",
  "link-danger": "text-danger underline hover:text-danger/80",
};

export function buttonVariants(
  variant: ButtonVariant = "primary",
  className = "",
): string {
  return `${BASE} ${VARIANT_CLASSES[variant]} ${className}`;
}
