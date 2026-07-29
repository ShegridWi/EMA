"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createSetProductAction } from "@/lib/actions/products";
import { useToast } from "@/components/ui/toast-provider";
import { Size, City } from "@/app/generated/prisma/enums";
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

// Set creation asks for the pieces up front (01-business-rules.md #2a):
// Top and Bottom are always created, Cap only if the admin checks it.
export function SetProductForm() {
  const t = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const tSize = useTranslations("Size");
  const tCity = useTranslations("City");
  const router = useRouter();
  const { showToast } = useToast();
  const [includeCap, setIncludeCap] = useState(false);

  async function action(
    _prevState: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const payload = {
      description: formData.get("description"),
      color: formData.get("color"),
      size: formData.get("size"),
      price: formData.get("price"),
      city: formData.get("city"),
      topQuantity: formData.get("topQuantity"),
      bottomQuantity: formData.get("bottomQuantity"),
      includeCap: formData.get("includeCap") === "on",
      capQuantity: formData.get("capQuantity") || 0,
    };

    return createSetProductAction(payload);
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  // `tCommon` deliberately excluded below — see the identical note in
  // components/materials/material-form.tsx.
  useEffect(() => {
    if (state?.success) {
      showToast("success", tCommon("actionCreated"));
      router.push("/inventory/products");
      router.refresh();
    } else if (state?.success === false) {
      showToast(
        "error",
        state.error === "Forbidden"
          ? tCommon("errorForbidden")
          : tCommon("errorValidation"),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router, showToast]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField label={t("description")} htmlFor="description">
        <Input id="description" name="description" required />
      </FormField>

      <FormField label={t("color")} htmlFor="color">
        <Input id="color" name="color" required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("size")} htmlFor="size">
          <Select id="size" name="size" required defaultValue={Size.M}>
            {Object.values(Size).map((size) => (
              <option key={size} value={size}>
                {tSize(size)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t("price")} htmlFor="price">
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </FormField>
      </div>

      <FormField label={t("city")} htmlFor="city">
        <Select id="city" name="city" required defaultValue={City.LA_PAZ}>
          {Object.values(City).map((city) => (
            <option key={city} value={city}>
              {tCity(city)}
            </option>
          ))}
        </Select>
      </FormField>

      <hr className="border-border" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("topQuantity")} htmlFor="topQuantity">
          <Input
            id="topQuantity"
            name="topQuantity"
            type="number"
            step="1"
            min="0"
            defaultValue={0}
            required
          />
        </FormField>

        <FormField label={t("bottomQuantity")} htmlFor="bottomQuantity">
          <Input
            id="bottomQuantity"
            name="bottomQuantity"
            type="number"
            step="1"
            min="0"
            defaultValue={0}
            required
          />
        </FormField>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="includeCap"
          name="includeCap"
          type="checkbox"
          checked={includeCap}
          onChange={(e) => setIncludeCap(e.target.checked)}
          className="size-4 cursor-pointer accent-primary"
        />
        <label
          htmlFor="includeCap"
          className="cursor-pointer text-sm font-medium"
        >
          {t("includeCap")}
        </label>
      </div>

      {includeCap && (
        <FormField label={t("capQuantity")} htmlFor="capQuantity">
          <Input
            id="capQuantity"
            name="capQuantity"
            type="number"
            step="1"
            min="0"
            defaultValue={0}
          />
        </FormField>
      )}

      {state?.success === false && (
        <Alert>
          {state.error === "Forbidden"
            ? tCommon("errorForbidden")
            : tCommon("errorValidation")}
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {tCommon("create")}
        </Button>
        <ButtonLink href="/inventory/products" variant="secondary">
          {tCommon("cancel")}
        </ButtonLink>
      </div>
    </form>
  );
}
