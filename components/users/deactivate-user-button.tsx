"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deactivateUserAction } from "@/lib/actions/users";
import { useToast } from "@/components/ui/toast-provider";
import { PromptModal } from "@/components/ui/prompt-modal";
import { PowerOff } from "lucide-react";

// `disabled` is passed by the caller (app/[locale]/(dashboard)/users/page.tsx)
// for the admin's own row — the Server Action rejects self-deactivation too
// (CannotDeactivateSelfError), but hiding it from the UI avoids a confusing
// error for a mistake that's easy to make by accident (see .prompts/06-users-admin.md).
//
// Uses PromptModal (components/ui) instead of window.confirm() — no
// `inputLabel` since deactivating doesn't take a reason (unlike
// reactivate), so the modal renders as a plain yes/no confirm, same as
// components/materials/deactivate-material-button.tsx and
// components/products/deactivate-product-button.tsx.
export function DeactivateUserButton({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
}) {
  const t = useTranslations("Users");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    startTransition(async () => {
      const result = await deactivateUserAction({ id });
      if (!result.success) {
        showToast(
          result.error === "cannot_deactivate_self" ? "warning" : "error",
          result.error === "cannot_deactivate_self"
            ? t("errorCannotDeactivateSelf")
            : tCommon("errorGeneric"),
        );
        return;
      }
      showToast("success", tCommon("actionDeactivated"));
      router.refresh();
    });
  }

  if (disabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-red-600 underline disabled:opacity-50 dark:text-red-400"
      >
        <PowerOff className="size-4" />
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
