"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { reactivateMaterialAction } from "@/lib/actions/materials";
import { PromptModal } from "@/components/ui/prompt-modal";

// Uses PromptModal (components/ui) instead of window.confirm(), same as
// components/products/reactivate-product-button.tsx — the optional
// note is stored on the REACTIVATE_MATERIAL MovementLog entry.
export function ReactivateMaterialButton({ id }: { id: string }) {
  const t = useTranslations("Materials");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm(reason: string) {
    setOpen(false);
    startTransition(async () => {
      await reactivateMaterialAction({ id, reason: reason.trim() || undefined });
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
