import type { HTMLAttributes } from "react";

export function MutedText({
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`} {...props} />
  );
}
