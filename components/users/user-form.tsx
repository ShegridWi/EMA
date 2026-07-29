"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createUserAction, updateUserAction } from "@/lib/actions/users";
import { useToast } from "@/components/ui/toast-provider";
import { Role, City } from "@/app/generated/prisma/enums";
import type { SerializedUser } from "@/lib/users";

type ActionResult =
  | { success: true; data: unknown }
  | { success: false; error: unknown }
  | null;

export function UserForm({ user }: { user?: SerializedUser }) {
  const t = useTranslations("Users");
  const tCommon = useTranslations("Common");
  const tRole = useTranslations("Role");
  const tCity = useTranslations("City");
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(user);

  async function action(
    _prevState: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const password = formData.get("password");
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      // Empty password field on edit means "keep the current one" —
      // omit it entirely rather than sending an empty string that would
      // fail the min-length validation.
      ...(password ? { password } : {}),
      role: formData.get("role"),
      city: formData.get("city"),
    };

    return user
      ? updateUserAction({ id: user.id, ...payload })
      : createUserAction(payload);
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  // `isEdit`/`t`/`tCommon` deliberately excluded below — see the
  // identical note in components/materials/material-form.tsx.
  useEffect(() => {
    if (state?.success) {
      showToast(
        "success",
        isEdit ? tCommon("actionUpdated") : tCommon("actionCreated"),
      );
      router.push("/users");
      router.refresh();
    } else if (state?.success === false) {
      if (state.error === "Forbidden") {
        showToast("error", tCommon("errorForbidden"));
      } else if (state.error === "email_in_use") {
        showToast("warning", t("errorEmailInUse"));
      } else {
        showToast("error", tCommon("errorValidation"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router, showToast]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={user?.name}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">
          {t("email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={user?.email}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          {isEdit ? t("passwordOptional") : t("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required={!isEdit}
          autoComplete="new-password"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          {t("role")}
        </label>
        <select
          id="role"
          name="role"
          required
          defaultValue={user?.role ?? Role.SELLER}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(Role).map((role) => (
            <option key={role} value={role}>
              {tRole(role)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="city" className="text-sm font-medium">
          {t("city")}
        </label>
        <select
          id="city"
          name="city"
          required
          defaultValue={user?.city ?? City.LA_PAZ}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(City).map((city) => (
            <option key={city} value={city}>
              {tCity(city)}
            </option>
          ))}
        </select>
      </div>

      {state?.success === false && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error === "Forbidden"
            ? tCommon("errorForbidden")
            : state.error === "email_in_use"
              ? t("errorEmailInUse")
              : tCommon("errorValidation")}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {isEdit ? tCommon("save") : tCommon("create")}
        </button>
        <Link
          href="/users"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
