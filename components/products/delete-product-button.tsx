"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteProductAction } from "@/lib/actions/products";
import { useToast } from "@/components/ui/toast-provider";
import { PromptModal } from "@/components/ui/prompt-modal";
import { IconButton } from "@/components/ui/icon-button";
import { Trash2 } from "lucide-react";

// Uses PromptModal (components/ui) instead of window.confirm() — no
// `inputLabel` since deleting doesn't take a reason, so the modal renders
// as a plain yes/no confirm, same as the deactivate buttons.
export function DeleteProductButton({ id }: { id: string }) {
  const t = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    startTransition(async () => {
      const result = await deleteProductAction({ id });
      if (!result.success) {
        showToast("error", t("errorGeneric"));
        return;
      }
      showToast("success", t("actionDeleted"));
      router.refresh();
    });
  }

  return (
    <>
      <IconButton
        variant="danger"
        icon={<Trash2 className="size-5" />}
        label={t("delete")}
        onClick={() => setOpen(true)}
        disabled={isPending}
      />

      <PromptModal
        open={open}
        title={t("delete")}
        message={t("confirmDelete")}
        confirmLabel={t("confirm")}
        cancelLabel={t("cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
