"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { reactivateProductAction } from "@/lib/actions/products";
import { PromptModal } from "@/components/ui/prompt-modal";
import { useToast } from "@/components/ui/toast-provider";

// Uses PromptModal (components/ui) instead of window.confirm(), same as
// components/users/reactivate-user-button.tsx — the optional note is
// stored on the REACTIVATE_PRODUCT MovementLog entry.
export function ReactivateProductButton({ id }: { id: string }) {
  const t = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm(reason: string) {
    setOpen(false);
    startTransition(async () => {
      const result = await reactivateProductAction({
        id,
        reason: reason.trim() || undefined,
      });
      if (!result.success) {
        showToast("error", tCommon("errorGeneric"));
        return;
      }
      showToast("success", tCommon("actionReactivated"));
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="text-sm underline disabled:opacity-50"
      >
        {t("reactivate")}
      </button>

      <PromptModal
        open={open}
        title={t("reactivate")}
        message={t("confirmReactivate")}
        inputLabel={t("reasonPrompt")}
        confirmLabel={tCommon("confirm")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
