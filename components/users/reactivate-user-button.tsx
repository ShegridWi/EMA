"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { reactivateUserAction } from "@/lib/actions/users";
import { PromptModal } from "@/components/ui/prompt-modal";
import { useToast } from "@/components/ui/toast-provider";
import { Power } from "lucide-react";

// Uses PromptModal (components/ui) instead of window.confirm() so the
// admin gets an explicit confirm step before restoring access, same as
// the sale return/void actions (components/sales/sale-actions.tsx) — the
// optional note is stored on the REACTIVATE_USER MovementLog entry.
export function ReactivateUserButton({ id }: { id: string }) {
  const t = useTranslations("Users");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm(reason: string) {
    setOpen(false);
    startTransition(async () => {
      const result = await reactivateUserAction({
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
        className="inline-flex items-center gap-1 text-sm underline disabled:opacity-50"
      >
        <Power className="size-4" />
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
