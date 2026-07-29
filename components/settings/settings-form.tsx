"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "@/i18n/navigation";
import { updateUserSettingsAction } from "@/lib/actions/user-settings";
import { useToast } from "@/components/ui/toast-provider";
import { Theme, Locale } from "@/app/generated/prisma/enums";
import { LOCALE_TO_ROUTE } from "@/lib/locale";
import type { UserSettings } from "@/app/generated/prisma/client";

type ActionResult =
  | { success: true; data: unknown }
  | { success: false; error: unknown }
  | null;

export function SettingsForm({ settings }: { settings: UserSettings }) {
  const t = useTranslations("Settings");
  const tCommon = useTranslations("Common");
  const tTheme = useTranslations("Theme");
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const currentLocale = useLocale();
  const { showToast } = useToast();

  const timeZones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  async function action(
    _prevState: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    return updateUserSettingsAction({
      timezone: formData.get("timezone"),
      theme: formData.get("theme"),
      locale: formData.get("locale"),
    });
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  // `t`/`tCommon` deliberately excluded below — see the identical note
  // in components/materials/material-form.tsx.
  useEffect(() => {
    if (state?.success === false) {
      showToast(
        "error",
        state.error === "Forbidden"
          ? tCommon("errorForbidden")
          : tCommon("errorValidation"),
      );
      return;
    }
    if (!state?.success) return;
    const saved = state.data as UserSettings;

    showToast("success", t("saveSuccess"));

    // Instant feedback for the browser that just submitted the form —
    // next-themes' own toggle keeps working exactly as before for any
    // *later* manual change (components/ui/theme-toggle.tsx), this just
    // applies the newly-saved value right away instead of waiting for
    // the next login.
    setTheme(saved.theme.toLowerCase());

    const newRoute = LOCALE_TO_ROUTE[saved.locale];
    if (newRoute !== currentLocale) {
      router.replace(pathname, { locale: newRoute });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, setTheme, router, pathname, currentLocale, showToast]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className="text-sm font-medium">
          {t("timezone")}
        </label>
        <select
          id="timezone"
          name="timezone"
          required
          defaultValue={settings.timezone}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="theme" className="text-sm font-medium">
          {t("theme")}
        </label>
        <select
          id="theme"
          name="theme"
          required
          defaultValue={settings.theme}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          <option value={Theme.LIGHT}>{tTheme("light")}</option>
          <option value={Theme.DARK}>{tTheme("dark")}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="locale" className="text-sm font-medium">
          {t("language")}
        </label>
        <select
          id="locale"
          name="locale"
          required
          defaultValue={settings.locale}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          <option value={Locale.ES}>{t("languageEs")}</option>
          <option value={Locale.EN}>{t("languageEn")}</option>
        </select>
      </div>

      {state?.success === false && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error === "Forbidden"
            ? tCommon("errorForbidden")
            : tCommon("errorValidation")}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {tCommon("save")}
        </button>
      </div>
    </form>
  );
}
