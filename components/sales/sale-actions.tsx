"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { returnSaleAction, voidSaleAction } from "@/lib/actions/sales";
import { PromptModal } from "@/components/ui/prompt-modal";
import { useToast } from "@/components/ui/toast-provider";
import { IconButton } from "@/components/ui/icon-button";
import { Ban, RotateCcw } from "lucide-react";

type PendingAction = "return" | "void" | null;

// ADMIN-only (enforced server-side in the Server Actions too). Both
// actions soft-delete the sale and restore the stock it deducted — see
// lib/inventory.ts's reverseSale for why they're symmetric. Confirmation
// + the optional reason are collected in one PromptModal (components/ui)
// instead of window.confirm()/window.prompt() — Cancel in the modal
// aborts the whole action (unlike the old window.prompt() step, where
// Cancel just meant "no reason"). Outcome feedback is a toast
// (components/ui/toast-provider) — replaces the old inline error text,
// since it also covers the success case this component didn't show before.
export function SaleActions({ saleId }: { saleId: string }) {
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  function handleConfirm(reason: string) {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    startTransition(async () => {
      const trimmedReason = reason.trim() || undefined;
      const result =
        action === "return"
          ? await returnSaleAction({ id: saleId, reason: trimmedReason })
          : await voidSaleAction({ id: saleId, reason: trimmedReason });

      if (!result.success) {
        showToast(
          result.error === "not_found" ? "warning" : "error",
          result.error === "not_found"
            ? t("errorNotFound")
            : tCommon("errorGeneric"),
        );
        return;
      }
      showToast(
        "success",
        action === "return" ? t("returnSuccess") : t("voidSuccess"),
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <IconButton
        icon={<RotateCcw className="size-5" />}
        label={t("markAsReturn")}
        onClick={() => setPendingAction("return")}
        disabled={isPending}
      />
      <IconButton
        variant="danger"
        icon={<Ban className="size-5" />}
        label={t("voidSale")}
        onClick={() => setPendingAction("void")}
        disabled={isPending}
      />

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
