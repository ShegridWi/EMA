import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type IconButtonVariant = "default" | "danger";

const BASE =
  "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  default: "border-border text-foreground hover:bg-muted",
  danger: "border-danger/40 text-danger hover:bg-danger/10",
};

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
};

// Square, bordered, icon-only action trigger — the large-icon pattern
// used for table row actions (edit/history/deactivate/delete/etc.) in
// place of the smaller inline icon+underlined-text links.
//
// The tooltip is the browser-native `title` attribute, not a custom
// absolutely-positioned span. These buttons live inside `overflow-x-auto`
// table wrappers (.claude/skills/tailwind-conventions/SKILL.md's table
// pattern) — an ancestor with overflow-x set to anything but `visible`
// has its overflow-y computed as `auto` too (a CSS overflow-module rule
// browsers apply even when overflow-y is left unset), so a custom
// tooltip popping outside the button's box got clipped for the last row
// and, worse, its appearance on hover made the wrapper think content
// overflowed vertically and spawn a scrollbar that wasn't otherwise
// needed. `title` is rendered by the browser chrome, not the DOM, so
// none of that applies — it's also always screen-reader accessible via
// the trigger's own `aria-label` (also set to `label` here) regardless.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = "default", className = "", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  ),
);
IconButton.displayName = "IconButton";

export type IconButtonLinkProps = ComponentProps<typeof Link> & {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
};

export function IconButtonLink({
  icon,
  label,
  variant = "default",
  className = "",
  ...props
}: IconButtonLinkProps) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={`${BASE} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {icon}
    </Link>
  );
}
