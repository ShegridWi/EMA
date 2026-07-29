import { forwardRef, type TextareaHTMLAttributes } from "react";

const FIELD_CLASSES =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors duration-200 ease-in-out placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className = "", ...props }, ref) => (
  <textarea ref={ref} className={`${FIELD_CLASSES} ${className}`} {...props} />
));
Textarea.displayName = "Textarea";
