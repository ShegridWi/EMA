"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deactivateMaterialAction } from "@/lib/actions/materials";
import { useToast } from "@/components/ui/toast-provider";
import { PromptModal } from "@/components/ui/prompt-modal";

// Uses PromptModal (components/ui) instead of window.confirm() — no
// `inputLabel` since deactivating doesn't take a reason (unlike
// reactivate), so the modal renders as a plain yes/no confirm.
export function DeactivateMaterialButton({ id }: { id: string }) {
  const t = useTranslations("Materials");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    startTransition(async () => {
      const result = await deactivateMaterialAction({ id });
      if (!result.success) {
        showToast("error", tCommon("errorGeneric"));
        return;
      }
      showToast("success", tCommon("actionDeactivated"));
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="text-red-600 underline disabled:opacity-50 dark:text-red-400"
      >
        {t("deactivate")}
      </button>

      <PromptModal
        open={open}
        title={t("deactivate")}
        message={t("confirmDeactivate")}
        confirmLabel={tCommon("confirm")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
