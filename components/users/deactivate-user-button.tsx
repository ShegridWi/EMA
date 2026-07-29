"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deactivateUserAction } from "@/lib/actions/users";
import { useToast } from "@/components/ui/toast-provider";

// `disabled` is passed by the caller (app/[locale]/(dashboard)/users/page.tsx)
// for the admin's own row — the Server Action rejects self-deactivation too
// (CannotDeactivateSelfError), but hiding it from the UI avoids a confusing
// error for a mistake that's easy to make by accident (see .prompts/06-users-admin.md).
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

  function handleDeactivate() {
    if (!window.confirm(t("confirmDeactivate"))) return;
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
