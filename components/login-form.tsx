"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginActionState } from "@/lib/actions/auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Login");
  const boundAction = loginAction.bind(null, locale);
  const [state, formAction, pending] = useActionState<
    LoginActionState,
    FormData
  >(boundAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField label={t("emailLabel")} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </FormField>
      <FormField label={t("passwordLabel")} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </FormField>
      {state?.success === false && (
        <Alert>
          {state.error === "invalid_credentials"
            ? t("errorInvalidCredentials")
            : t("errorGeneric")}
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
