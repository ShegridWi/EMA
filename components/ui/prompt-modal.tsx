"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { FormField } from "./form-field";

export type PromptModalProps = {
  open: boolean;
  title: string;
  message?: string;
  inputLabel?: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
};

/**
 * Generic "confirm this action, optionally explain why" dialog, built on
 * the native <dialog> element (no UI library dependency, per CLAUDE.md's
 * preference for simple/low-maintenance solutions). Replaces ad hoc
 * window.confirm()/window.prompt() pairs — first used for the sale
 * return/void reason, but written to be reused anywhere else the app
 * needs the same "confirm + optional free text" shape.
 *
 * Omit `inputLabel` for a plain yes/no confirm (e.g. deactivate buttons)
 * — the textarea only renders when there's a label for it, so a caller
 * that doesn't need free text doesn't get an unexplained empty box.
 *
 * Purely presentational: all copy (title/message/labels) is passed in
 * by the caller, so this component has no next-intl dependency, per the
 * components/ui/ convention in 05-nextjs-conventions.md.
 *
 * Controlled via `open` — the parent owns the open/closed state and
 * decides what to do with the confirmed value.
 *
 * The <dialog> itself owns focus-trap/Escape/top-layer behavior (kept
 * native rather than replaced by framer-motion, per
 * .claude/skills/motion-and-transitions/SKILL.md); only its *content* is
 * animated via framer-motion. Closing is deferred until the exit
 * animation finishes (see onAnimationComplete below) instead of calling
 * dialog.close() the instant `open` flips to false, so the fade/scale-out
 * actually gets to play before the native dialog (and its ::backdrop)
 * disappear.
 */
export function PromptModal({
  open,
  title,
  message,
  inputLabel,
  placeholder,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: PromptModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setValue("");
      dialog.showModal();
    }
    // Closing the native dialog is handled by onAnimationComplete below,
    // once the exit animation finishes — not here.
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(value);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        // Prevent the native instant close on Escape — let the `open`
        // state flip to false first, so the exit animation plays before
        // the dialog actually closes (same reasoning as the Cancel
        // button, which never calls dialog.close() directly either).
        event.preventDefault();
        onCancel();
      }}
      // Native <dialog> centers itself via the UA stylesheet's
      // `margin: auto`, but Tailwind's preflight reset zeroes out margin
      // on every element first — so it has to be re-applied explicitly
      // here instead of relying on the browser default.
      className="fixed top-1/2 left-1/2 m-0 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-background p-0 text-foreground backdrop:bg-black/50"
    >
      <motion.div
        initial={false}
        animate={open ? "visible" : "hidden"}
        variants={{
          visible: { opacity: 1, scale: 1 },
          hidden: { opacity: 0, scale: 0.95 },
        }}
        transition={
          open ? { duration: 0.2, ease: "easeOut" } : { duration: 0.15, ease: "easeIn" }
        }
        onAnimationComplete={(variant) => {
          if (variant === "hidden") dialogRef.current?.close();
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">{title}</h2>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>

          {inputLabel && (
            <FormField label={inputLabel} htmlFor="prompt-modal-input">
              <Textarea
                id="prompt-modal-input"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                rows={3}
              />
            </FormField>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button type="submit">{confirmLabel}</Button>
          </div>
        </form>
      </motion.div>
    </dialog>
  );
}
