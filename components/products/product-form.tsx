"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  createUnitProductAction,
  updateProductAction,
} from "@/lib/actions/products";
import { useToast } from "@/components/ui/toast-provider";
import { Size, City } from "@/app/generated/prisma/enums";
import type { SerializedProduct } from "@/lib/inventory";
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

// Used both to create a standalone unit and to edit any existing product
// row (set container or piece) — editing never touches kind/setId/
// pieceRole, only the descriptive/stock fields (lib/validations/product.ts).
export function ProductForm({ product }: { product?: SerializedProduct }) {
  const t = useTranslations("Products");
  const tCommon = useTranslations("Common");
  const tSize = useTranslations("Size");
  const tCity = useTranslations("City");
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = Boolean(product);

  async function action(
    _prevState: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const payload = {
      description: formData.get("description"),
      color: formData.get("color"),
      size: formData.get("size"),
      quantity: formData.get("quantity"),
      price: formData.get("price"),
      city: formData.get("city"),
    };

    return product
      ? updateProductAction({ id: product.id, ...payload })
      : createUnitProductAction(payload);
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  // `isEdit`/`tCommon` deliberately excluded below — see the identical
  // note in components/materials/material-form.tsx.
  useEffect(() => {
    if (state?.success) {
      showToast(
        "success",
        isEdit ? tCommon("actionUpdated") : tCommon("actionCreated"),
      );
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
        <Input
          id="description"
          name="description"
          required
          defaultValue={product?.description}
        />
      </FormField>

      <FormField label={t("color")} htmlFor="color">
        <Input
          id="color"
          name="color"
          required
          defaultValue={product?.color}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("size")} htmlFor="size">
          <Select
            id="size"
            name="size"
            required
            defaultValue={product?.size ?? Size.M}
          >
            {Object.values(Size).map((size) => (
              <option key={size} value={size}>
                {tSize(size)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t("quantity")} htmlFor="quantity">
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="1"
            min="0"
            required
            defaultValue={product?.quantity}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("price")} htmlFor="price">
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product?.price}
          />
        </FormField>

        <FormField label={t("city")} htmlFor="city">
          <Select
            id="city"
            name="city"
            required
            defaultValue={product?.city ?? City.LA_PAZ}
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
            : tCommon("errorValidation")}
        </Alert>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {isEdit ? tCommon("save") : tCommon("create")}
        </Button>
        <ButtonLink href="/inventory/products" variant="secondary">
          {tCommon("cancel")}
        </ButtonLink>
      </div>
    </form>
  );
}
