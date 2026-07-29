"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteMaterialAction } from "@/lib/actions/materials";

export function DeleteMaterialButton({ id }: { id: string }) {
  const t = useTranslations("Common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      await deleteMaterialAction({ id });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 underline disabled:opacity-50 dark:text-red-400"
    >
      {t("delete")}
    </button>
  );
}
