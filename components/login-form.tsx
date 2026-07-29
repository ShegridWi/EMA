"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginActionState } from "@/lib/actions/auth";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Login");
  const boundAction = loginAction.bind(null, locale);
  const [state, formAction, pending] = useActionState<
    LoginActionState,
    FormData
  >(boundAction, null);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t("emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          {t("passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>
      {state?.success === false && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error === "invalid_credentials"
            ? t("errorInvalidCredentials")
            : t("errorGeneric")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
