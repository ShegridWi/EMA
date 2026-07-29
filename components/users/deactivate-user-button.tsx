"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deactivateUserAction } from "@/lib/actions/users";

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDeactivate() {
    if (!window.confirm(t("confirmDeactivate"))) return;
    setError(null);
    startTransition(async () => {
      const result = await deactivateUserAction({ id });
      if (!result.success) {
        setError(
          result.error === "cannot_deactivate_self"
            ? "cannot_deactivate_self"
            : "generic",
        );
        return;
      }
      router.refresh();
    });
  }

  if (disabled) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleDeactivate}
        disabled={isPending}
        className="text-red-600 underline disabled:opacity-50 dark:text-red-400"
      >
        {t("deactivate")}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error === "cannot_deactivate_self"
            ? t("errorCannotDeactivateSelf")
            : tCommon("errorGeneric")}
        </p>
      )}
    </div>
  );
}
