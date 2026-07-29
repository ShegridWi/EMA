"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deactivateProductAction } from "@/lib/actions/products";
import { useToast } from "@/components/ui/toast-provider";

export function DeactivateProductButton({ id }: { id: string }) {
  const t = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    if (!window.confirm(t("confirmDeactivate"))) return;
    startTransition(async () => {
      const result = await deactivateProductAction({ id });
      if (!result.success) {
        showToast("error", tCommon("errorGeneric"));
        return;
      }
      showToast("success", tCommon("actionDeactivated"));
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDeactivate}
      disabled={isPending}
      className="text-red-600 underline disabled:opacity-50 dark:text-red-400"
    >
      {t("deactivate")}
    </button>
  );
}
