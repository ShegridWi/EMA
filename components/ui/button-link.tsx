import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { buttonVariants, type ButtonVariant } from "./button-variants";

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonVariants(variant, className)} {...props} />;
}
