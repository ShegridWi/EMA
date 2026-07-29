"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export type ToastType = "success" | "error" | "warning";

type Toast = { id: number; type: ToastType; message: string };

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Fixed at 3 seconds per spec — every CRUD action across the app
// (materials/products/sales/users/settings) reports through this same
// provider, so the timing only needs to live in one place.
const TOAST_DURATION_MS = 3000;

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Mounted once at the dashboard layout level (app/[locale]/(dashboard)/layout.tsx)
// — every CRUD component below it calls useToast() to report its own
// outcome; this provider only owns the stacking/timing/rendering, never
// the message content (that's always supplied by the caller, same "copy
// as props" idea as components/ui/prompt-modal.tsx).
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, type, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismiss(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// bg-<token>/10 keeps the surface a tint of the status color instead of
// a solid fill, with the full-strength token for the border/text — same
// idea across all three, semantic tokens only (see
// .claude/skills/theming-user-settings/SKILL.md).
const TOAST_STYLES: Record<ToastType, string> = {
  success: "border-success bg-success/10 text-success",
  error: "border-danger bg-danger/10 text-danger",
  warning: "border-warning bg-warning/10 text-warning",
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const t = useTranslations("Toast");

  // `onDismiss` is a fresh closure every render (built from toast.id in
  // the parent's map) — depending on it would reset the 3-second timer
  // on every unrelated re-render instead of firing it once.
  useEffect(() => {
    const timer = setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      role="status"
      layout
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className={`pointer-events-auto flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg ${TOAST_STYLES[toast.type]}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="cursor-pointer leading-none opacity-70 transition-opacity duration-200 ease-in-out hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}
