"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { returnSaleAction, voidSaleAction } from "@/lib/actions/sales";

// ADMIN-only (enforced server-side in the Server Actions too). Both
// actions soft-delete the sale and restore the stock it deducted — see
// lib/inventory.ts's reverseSale for why they're symmetric.
export function SaleActions({ saleId }: { saleId: string }) {
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReturn() {
    if (!window.confirm(t("confirmReturn"))) return;
    setError(null);
    startTransition(async () => {
      const result = await returnSaleAction({ id: saleId });
      if (!result.success) {
        setError(result.error === "not_found" ? "not_found" : "generic");
        return;
      }
      router.refresh();
    });
  }

  function handleVoid() {
    if (!window.confirm(t("confirmVoid"))) return;
    setError(null);
    startTransition(async () => {
      const result = await voidSaleAction({ id: saleId });
      if (!result.success) {
        setError(result.error === "not_found" ? "not_found" : "generic");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleReturn}
          disabled={isPending}
          className="text-sm underline disabled:opacity-50"
        >
          {t("markAsReturn")}
        </button>
        <button
          type="button"
          onClick={handleVoid}
          disabled={isPending}
          className="text-sm text-red-600 underline disabled:opacity-50 dark:text-red-400"
        >
          {t("voidSale")}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error === "not_found" ? t("errorNotFound") : tCommon("errorGeneric")}
        </p>
      )}
    </div>
  );
}
