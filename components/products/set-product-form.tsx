"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createSetProductAction } from "@/lib/actions/products";
import { Size, City } from "@/app/generated/prisma/enums";

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

  useEffect(() => {
    if (state?.success) {
      router.push("/inventory/products");
      router.refresh();
    }
  }, [state, router]);

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
          defaultValue={Size.M}
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
          defaultValue={City.LA_PAZ}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(City).map((city) => (
            <option key={city} value={city}>
              {tCity(city)}
            </option>
          ))}
        </select>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      <div className="flex flex-col gap-1">
        <label htmlFor="topQuantity" className="text-sm font-medium">
          {t("topQuantity")}
        </label>
        <input
          id="topQuantity"
          name="topQuantity"
          type="number"
          step="1"
          min="0"
          defaultValue={0}
          required
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="bottomQuantity" className="text-sm font-medium">
          {t("bottomQuantity")}
        </label>
        <input
          id="bottomQuantity"
          name="bottomQuantity"
          type="number"
          step="1"
          min="0"
          defaultValue={0}
          required
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="includeCap"
          name="includeCap"
          type="checkbox"
          checked={includeCap}
          onChange={(e) => setIncludeCap(e.target.checked)}
          className="h-4 w-4"
        />
        <label htmlFor="includeCap" className="text-sm font-medium">
          {t("includeCap")}
        </label>
      </div>

      {includeCap && (
        <div className="flex flex-col gap-1">
          <label htmlFor="capQuantity" className="text-sm font-medium">
            {t("capQuantity")}
          </label>
          <input
            id="capQuantity"
            name="capQuantity"
            type="number"
            step="1"
            min="0"
            defaultValue={0}
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </div>
      )}

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
          {tCommon("create")}
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
