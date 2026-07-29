"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deactivateProductAction } from "@/lib/actions/products";

export function DeactivateProductButton({ id }: { id: string }) {
  const t = useTranslations("Products");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    if (!window.confirm(t("confirmDeactivate"))) return;
    startTransition(async () => {
      await deactivateProductAction({ id });
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
