"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createUserAction, updateUserAction } from "@/lib/actions/users";
import { useToast } from "@/components/ui/toast-provider";
import { Role, City } from "@/app/generated/prisma/enums";
import type { SerializedUser } from "@/lib/users";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";

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
      <FormField label={t("name")} htmlFor="name">
        <Input id="name" name="name" required defaultValue={user?.name} />
      </FormField>

      <FormField label={t("email")} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={user?.email}
        />
      </FormField>

      <FormField
        label={isEdit ? t("passwordOptional") : t("password")}
        htmlFor="password"
      >
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required={!isEdit}
          autoComplete="new-password"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("role")} htmlFor="role">
          <Select
            id="role"
            name="role"
            required
            defaultValue={user?.role ?? Role.SELLER}
          >
            {Object.values(Role).map((role) => (
              <option key={role} value={role}>
                {tRole(role)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t("city")} htmlFor="city">
          <Select
            id="city"
            name="city"
            required
            defaultValue={user?.city ?? City.LA_PAZ}
          >
            {Object.values(City).map((city) => (
              <option key={city} value={city}>
                {tCity(city)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {state?.success === false && (
        <Alert>
          {state.error === "Forbidden"
            ? tCommon("errorForbidden")
            : state.error === "email_in_use"
              ? t("errorEmailInUse")
              : tCommon("errorValidation")}
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? tCommon("save") : tCommon("create")}
        </Button>
        <ButtonLink href="/users" variant="secondary">
          {tCommon("cancel")}
        </ButtonLink>
      </div>
    </form>
  );
}
