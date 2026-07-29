"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  createMaterialAction,
  updateMaterialAction,
} from "@/lib/actions/materials";
import { Unit, City } from "@/app/generated/prisma/enums";
import type { Material } from "@/app/generated/prisma/client";

type ActionResult =
  | { success: true; data: unknown }
  | { success: false; error: unknown }
  | null;

export function MaterialForm({ material }: { material?: Material }) {
  const t = useTranslations("Materials");
  const tCommon = useTranslations("Common");
  const tUnit = useTranslations("Unit");
  const tCity = useTranslations("City");
  const router = useRouter();
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

  useEffect(() => {
    if (state?.success) {
      router.push("/inventory/materials");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="materialType" className="text-sm font-medium">
          {t("materialType")}
        </label>
        <input
          id="materialType"
          name="materialType"
          required
          defaultValue={material?.materialType}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-sm font-medium">
          {t("type")}
        </label>
        <input
          id="type"
          name="type"
          required
          defaultValue={material?.type}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="color" className="text-sm font-medium">
          {t("colorOptional")}
        </label>
        <input
          id="color"
          name="color"
          defaultValue={material?.color ?? ""}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="quantity" className="text-sm font-medium">
          {t("quantity")}
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={material?.quantity.toString()}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="unit" className="text-sm font-medium">
          {t("unit")}
        </label>
        <select
          id="unit"
          name="unit"
          required
          defaultValue={material?.unit ?? Unit.METERS}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(Unit).map((unit) => (
            <option key={unit} value={unit}>
              {tUnit(unit)}
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
          defaultValue={material?.city ?? City.LA_PAZ}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(City).map((city) => (
            <option key={city} value={city}>
              {tCity(city)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="purchasePrice" className="text-sm font-medium">
          {t("purchasePrice")}
        </label>
        <input
          id="purchasePrice"
          name="purchasePrice"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={material?.purchasePrice.toString()}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
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
          href="/inventory/materials"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
