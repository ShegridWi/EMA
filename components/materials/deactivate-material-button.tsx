"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deactivateMaterialAction } from "@/lib/actions/materials";

export function DeactivateMaterialButton({ id }: { id: string }) {
  const t = useTranslations("Materials");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDeactivate() {
    if (!window.confirm(t("confirmDeactivate"))) return;
    startTransition(async () => {
      await deactivateMaterialAction({ id });
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
