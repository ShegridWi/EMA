"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { reactivateUserAction } from "@/lib/actions/users";
import { PromptModal } from "@/components/ui/prompt-modal";

// Uses PromptModal (components/ui) instead of window.confirm() so the
// admin gets an explicit confirm step before restoring access, same as
// the sale return/void actions (components/sales/sale-actions.tsx) — the
// optional note is stored on the REACTIVATE_USER MovementLog entry.
export function ReactivateUserButton({ id }: { id: string }) {
  const t = useTranslations("Users");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm(reason: string) {
    setOpen(false);
    startTransition(async () => {
      await reactivateUserAction({ id, reason: reason.trim() || undefined });
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
