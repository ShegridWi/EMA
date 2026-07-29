import type { ReactNode } from "react";

type AlertVariant = "danger" | "warning" | "success";

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
};

export function Alert({
  variant = "danger",
  children,
}: {
  variant?: AlertVariant;
  children: ReactNode;
}) {
  return (
    <p role="alert" className={`text-sm ${VARIANT_CLASSES[variant]}`}>
      {children}
    </p>
  );
}
