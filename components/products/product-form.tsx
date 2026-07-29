"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  createUnitProductAction,
  updateProductAction,
} from "@/lib/actions/products";
import { useToast } from "@/components/ui/toast-provider";
import { Size, City } from "@/app/generated/prisma/enums";
import type { SerializedProduct } from "@/lib/inventory";

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
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          {t("description")}
        </label>
        <input
          id="description"
          name="description"
          required
          defaultValue={product?.description}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="color" className="text-sm font-medium">
          {t("color")}
        </label>
        <input
          id="color"
          name="color"
          required
          defaultValue={product?.color}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="size" className="text-sm font-medium">
          {t("size")}
        </label>
        <select
          id="size"
          name="size"
          required
          defaultValue={product?.size ?? Size.M}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(Size).map((size) => (
            <option key={size} value={size}>
              {tSize(size)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="quantity" className="text-sm font-medium">
          {t("quantity")}
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          step="1"
          min="0"
          required
          defaultValue={product?.quantity}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="price" className="text-sm font-medium">
          {t("price")}
        </label>
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={product?.price}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="city" className="text-sm font-medium">
          {t("city")}
        </label>
        <select
          id="city"
          name="city"
          required
          defaultValue={product?.city ?? City.LA_PAZ}
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
          href="/inventory/products"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
