"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createMaterialAction,
  updateMaterialAction,
} from "@/lib/actions/materials";
import { useToast } from "@/components/ui/toast-provider";
import { Unit, City } from "@/app/generated/prisma/enums";
import type { SerializedMaterial } from "@/lib/inventory";
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

export function MaterialForm({
  material,
}: {
  material?: SerializedMaterial;
}) {
  const t = useTranslations("Materials");
  const tCommon = useTranslations("Common");
  const tUnit = useTranslations("Unit");
  const tCity = useTranslations("City");
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(material);

  async function action(
    _prevState: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const payload = {
      materialType: formData.get("materialType"),
      color: formData.get("color") || undefined,
      type: formData.get("type"),
      quantity: formData.get("quantity"),
      unit: formData.get("unit"),
      city: formData.get("city"),
      purchasePrice: formData.get("purchasePrice"),
    };

    return material
      ? updateMaterialAction({ id: material.id, ...payload })
      : createMaterialAction(payload);
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  // `isEdit`/`tCommon` deliberately excluded below: `tCommon` isn't a
  // referentially stable function across renders (next-intl), so
  // depending on it would re-fire this effect (re-showing the toast,
  // re-navigating) on unrelated re-renders instead of only when `state`
  // actually changes. `isEdit` is derived from a prop that doesn't
  // change within this component's lifetime.
  useEffect(() => {
    if (state?.success) {
      showToast(
        "success",
        isEdit ? tCommon("actionUpdated") : tCommon("actionCreated"),
      );
      router.push("/inventory/materials");
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
      <FormField label={t("materialType")} htmlFor="materialType">
        <Input
          id="materialType"
          name="materialType"
          required
          defaultValue={material?.materialType}
        />
      </FormField>

      <FormField label={t("type")} htmlFor="type">
        <Input id="type" name="type" required defaultValue={material?.type} />
      </FormField>

      <FormField label={t("colorOptional")} htmlFor="color">
        <Input id="color" name="color" defaultValue={material?.color ?? ""} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("quantity")} htmlFor="quantity">
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={material?.quantity}
          />
        </FormField>

        <FormField label={t("unit")} htmlFor="unit">
          <Select
            id="unit"
            name="unit"
            required
            defaultValue={material?.unit ?? Unit.METERS}
          >
            {Object.values(Unit).map((unit) => (
              <option key={unit} value={unit}>
                {tUnit(unit)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("city")} htmlFor="city">
          <Select
            id="city"
            name="city"
            required
            defaultValue={material?.city ?? City.LA_PAZ}
          >
            {Object.values(City).map((city) => (
              <option key={city} value={city}>
                {tCity(city)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t("purchasePrice")} htmlFor="purchasePrice">
          <Input
            id="purchasePrice"
            name="purchasePrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={material?.purchasePrice}
          />
        </FormField>
      </div>

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
          {isEdit ? tCommon("save") : tCommon("create")}
        </Button>
        <ButtonLink href="/inventory/materials" variant="secondary">
          {tCommon("cancel")}
        </ButtonLink>
      </div>
    </form>
  );
}
