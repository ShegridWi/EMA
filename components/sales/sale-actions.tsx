"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { returnSaleAction, voidSaleAction } from "@/lib/actions/sales";
import { PromptModal } from "@/components/ui/prompt-modal";

type PendingAction = "return" | "void" | null;

// ADMIN-only (enforced server-side in the Server Actions too). Both
// actions soft-delete the sale and restore the stock it deducted — see
// lib/inventory.ts's reverseSale for why they're symmetric. Confirmation
// + the optional reason are collected in one PromptModal (components/ui)
// instead of window.confirm()/window.prompt() — Cancel in the modal
// aborts the whole action (unlike the old window.prompt() step, where
// Cancel just meant "no reason").
export function SaleActions({ saleId }: { saleId: string }) {
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  function handleConfirm(reason: string) {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    setError(null);
    startTransition(async () => {
      const trimmedReason = reason.trim() || undefined;
      const result =
        action === "return"
          ? await returnSaleAction({ id: saleId, reason: trimmedReason })
          : await voidSaleAction({ id: saleId, reason: trimmedReason });

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
          onClick={() => setPendingAction("return")}
          disabled={isPending}
          className="text-sm underline disabled:opacity-50"
        >
          {t("markAsReturn")}
        </button>
        <button
          type="button"
          onClick={() => setPendingAction("void")}
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

      <PromptModal
        open={pendingAction !== null}
        title={pendingAction === "return" ? t("markAsReturn") : t("voidSale")}
        message={
          pendingAction === "return" ? t("confirmReturn") : t("confirmVoid")
        }
        inputLabel={t("reasonPrompt")}
        confirmLabel={tCommon("confirm")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
