import { forwardRef, type ButtonHTMLAttributes } from "react";
import { buttonVariants, type ButtonVariant } from "./button-variants";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants(variant, className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
