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
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";

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
      <FormField label={t("timezone")} htmlFor="timezone">
        <Select
          id="timezone"
          name="timezone"
          required
          defaultValue={settings.timezone}
        >
          {timeZones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t("theme")} htmlFor="theme">
        <Select id="theme" name="theme" required defaultValue={settings.theme}>
          <option value={Theme.LIGHT}>{tTheme("light")}</option>
          <option value={Theme.DARK}>{tTheme("dark")}</option>
        </Select>
      </FormField>

      <FormField label={t("language")} htmlFor="locale">
        <Select
          id="locale"
          name="locale"
          required
          defaultValue={settings.locale}
        >
          <option value={Locale.ES}>{t("languageEs")}</option>
          <option value={Locale.EN}>{t("languageEn")}</option>
        </Select>
      </FormField>

      {state?.success === false && (
        <Alert>
          {state.error === "Forbidden"
            ? tCommon("errorForbidden")
            : tCommon("errorValidation")}
        </Alert>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>
    </form>
  );
}
