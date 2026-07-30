"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Bell } from "lucide-react";
import { getPedidoNotificationsAction } from "@/lib/actions/pedidos";
import type { City, RequestKind } from "@/app/generated/prisma/enums";

export type PedidoNotificationItem = {
  id: string;
  kind: RequestKind;
  customerName: string;
  city: City;
  createdAt: Date | string;
};

// Periodic light-weight poll, not websockets/SSE — matches this app's
// "simple, low-maintenance" philosophy (CLAUDE.md section 1) for a
// low-traffic internal tool.
const POLL_INTERVAL_MS = 60_000;

function dismissedStorageKey(userId: string) {
  return `ema:dismissedPedidoNotifications:${userId}`;
}

// A dismissed pedido is a per-browser "I've already looked at this"
// marker, not a status change — the pedido itself stays PENDING and
// still shows up for every other eligible seller/admin. Read/write
// wrapped in try/catch since localStorage can throw (private browsing,
// storage disabled).
function loadDismissed(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(dismissedStorageKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(userId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(dismissedStorageKey(userId), JSON.stringify([...ids]));
  } catch {
    // Ignore — worst case, dismissed notifications reappear next visit.
  }
}

// Server-rendered `initialItems` (components/pedido-badge.tsx) avoids a
// flash of "no notifications" on first paint; this component then keeps
// the list fresh via a periodic poll and layers the per-browser
// dismissed-state filter on top.
export function PedidoNotifications({
  userId,
  initialItems,
}: {
  userId: string;
  initialItems: PedidoNotificationItem[];
}) {
  const t = useTranslations("Pedidos");
  const tRequestKind = useTranslations("RequestKind");
  const tCity = useTranslations("City");
  const locale = useLocale();
  const router = useRouter();

  const [items, setItems] = useState(initialItems);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed(userId));
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await getPedidoNotificationsAction();
      if (!result.success) return;
      setItems(result.data.items);
      // Prune dismissed ids that dropped out of the live list (claimed,
      // cancelled, or converted elsewhere) so this set doesn't grow
      // forever.
      setDismissed((current) => {
        const next = new Set(
          [...current].filter((id) => result.data.items.some((item) => item.id === id)),
        );
        saveDismissed(userId, next);
        return next;
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const visibleItems = items.filter((item) => !dismissed.has(item.id));

  function handleSelect(id: string) {
    setDismissed((current) => {
      const next = new Set(current);
      next.add(id);
      saveDismissed(userId, next);
      return next;
    });
    setOpen(false);
    router.push(`/pedidos/${id}`);
  }

  if (visibleItems.length === 0) return null;

  const label = t("pendingBadgeLabel", { count: visibleItems.length });

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        aria-label={label}
        className="relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-foreground transition-colors duration-200 ease-in-out hover:bg-muted"
      >
        <Bell className="size-5" />
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-danger text-xs font-semibold text-danger-foreground">
          {visibleItems.length > 9 ? "9+" : visibleItems.length}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-md border border-border bg-background shadow-lg"
        >
          <p className="border-b border-border px-4 py-2 text-sm font-semibold">
            {t("notificationsTitle")}
          </p>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {visibleItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(item.id)}
                  className="flex w-full cursor-pointer flex-col gap-0.5 px-4 py-2.5 text-left text-sm transition-colors duration-200 ease-in-out hover:bg-muted"
                >
                  <span className="font-medium">{item.customerName}</span>
                  <span className="text-xs text-muted-foreground">
                    {tRequestKind(item.kind)} · {tCity(item.city)} ·{" "}
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(item.createdAt))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
