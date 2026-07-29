"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

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
 * Purely presentational: all copy (title/message/labels) is passed in
 * by the caller, so this component has no next-intl dependency, per the
 * components/ui/ convention in 05-nextjs-conventions.md.
 *
 * Controlled via `open` — the parent owns the open/closed state and
 * decides what to do with the confirmed value.
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
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm(value);
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={() => onCancel()}
      // Native <dialog> centers itself via the UA stylesheet's
      // `margin: auto`, but Tailwind's preflight reset zeroes out margin
      // on every element first — so it has to be re-applied explicitly
      // here instead of relying on the browser default.
      className="fixed top-1/2 left-1/2 m-0 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-zinc-300 bg-white p-0 text-zinc-900 backdrop:bg-black/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">{title}</h2>
          {message && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {inputLabel && (
            <label
              htmlFor="prompt-modal-input"
              className="text-sm font-medium"
            >
              {inputLabel}
            </label>
          )}
          <textarea
            id="prompt-modal-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            rows={3}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
