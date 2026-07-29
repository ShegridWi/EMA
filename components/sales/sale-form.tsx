"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createSaleAction } from "@/lib/actions/sales";
import { useToast } from "@/components/ui/toast-provider";
import { City, SaleType, PaymentMethod } from "@/app/generated/prisma/enums";
import type { SerializedProduct } from "@/lib/inventory";

type ActionResult =
  | { success: true; data: unknown }
  | { success: false; error: unknown }
  | null;

export function SaleForm({ products }: { products: SerializedProduct[] }) {
  const t = useTranslations("Sales");
  const tCommon = useTranslations("Common");
  const tCity = useTranslations("City");
  const tSaleType = useTranslations("SaleType");
  const tPaymentMethod = useTranslations("PaymentMethod");
  const router = useRouter();
  const { showToast } = useToast();

  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [productSearch, setProductSearch] = useState("");
  const [saleType, setSaleType] = useState<string>(SaleType.CASH);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    PaymentMethod.CASH,
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.description} ${product.color}`.toLowerCase().includes(query),
    );
  }, [products, productSearch]);

  // Derived during render (not synced via an effect): if the current
  // selection falls outside the search filter, fall back to the first
  // match. `productId` itself only changes on an explicit user pick.
  const effectiveProductId = filteredProducts.some((p) => p.id === productId)
    ? productId
    : (filteredProducts[0]?.id ?? "");

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === effectiveProductId),
    [products, effectiveProductId],
  );

  async function action(
    _prevState: ActionResult,
    formData: FormData,
  ): Promise<ActionResult> {
    const payload = {
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
      unitPrice: formData.get("unitPrice"),
      city: formData.get("city"),
      saleDate: formData.get("saleDate"),
      saleType: formData.get("saleType"),
      paymentMethod: formData.get("paymentMethod"),
      amountPaid: formData.get("amountPaid"),
      deliveryDate: formData.get("deliveryDate") || undefined,
      customerName: formData.get("customerName") || undefined,
      customerPhone: formData.get("customerPhone") || undefined,
      notes: formData.get("notes") || undefined,
    };

    return createSaleAction(payload);
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    action,
    null,
  );

  // `t`/`tCommon` deliberately excluded below — see the identical note
  // in components/materials/material-form.tsx.
  useEffect(() => {
    if (state?.success) {
      showToast("success", t("createSuccess"));
      router.push("/sales");
      router.refresh();
    } else if (state?.success === false) {
      if (state.error === "Forbidden") {
        showToast("error", tCommon("errorForbidden"));
      } else if (state.error === "insufficient_stock") {
        showToast("warning", t("errorInsufficientStock"));
      } else {
        showToast("error", tCommon("errorValidation"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, router, showToast]);

  if (products.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {tCommon("empty")}
      </p>
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="productId" className="text-sm font-medium">
          {t("product")}
        </label>
        <input
          type="search"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder={t("searchProductPlaceholder")}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />

        {/*
          Quick-pick results list under the search box. Clicking a row
          just updates `productId` — the same state the <select> below
          reads — so the dropdown's selection updates automatically
          without any extra wiring. Each row (and each <option>) shows
          whether the product is a Set or a Unit, since that isn't
          obvious from the description alone.
        */}
        <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-300 dark:border-zinc-700">
          {filteredProducts.length === 0 ? (
            <p className="p-2 text-xs text-zinc-500 dark:text-zinc-400">
              {t("searchResultsEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredProducts.map((product) => {
                const isSelected = product.id === effectiveProductId;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => setProductId(product.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                        isSelected ? "bg-zinc-100 dark:bg-zinc-900" : ""
                      }`}
                    >
                      <span>
                        {product.description} ({product.color}, {product.size})
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {product.kind === "SET" ? t("kindSet") : t("kindUnit")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <select
          id="productId"
          name="productId"
          required
          value={effectiveProductId}
          onChange={(e) => setProductId(e.target.value)}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {filteredProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.description} ({product.color}, {product.size}) —{" "}
              {product.kind === "SET" ? t("kindSet") : t("kindUnit")}
            </option>
          ))}
        </select>
        {selectedProduct && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {selectedProduct.kind === "UNIT"
              ? t("unitAvailable", { count: selectedProduct.quantity })
              : t("setNoStockShown")}
          </p>
        )}
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
          min="1"
          required
          defaultValue={1}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="unitPrice" className="text-sm font-medium">
          {t("unitPrice")}
        </label>
        <input
          key={selectedProduct?.id}
          id="unitPrice"
          name="unitPrice"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={selectedProduct?.price}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <input
        type="hidden"
        name="city"
        value={selectedProduct?.city ?? City.LA_PAZ}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t("city")}:{" "}
        {selectedProduct ? tCity(selectedProduct.city) : "—"}
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="saleDate" className="text-sm font-medium">
          {t("saleDate")}
        </label>
        <input
          id="saleDate"
          name="saleDate"
          type="date"
          required
          defaultValue={todayStr}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="saleType" className="text-sm font-medium">
          {t("saleType")}
        </label>
        <select
          id="saleType"
          name="saleType"
          required
          value={saleType}
          onChange={(e) => setSaleType(e.target.value)}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(SaleType).map((type) => (
            <option key={type} value={type}>
              {tSaleType(type)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="paymentMethod" className="text-sm font-medium">
          {t("paymentMethod")}
        </label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          required
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          {Object.values(PaymentMethod).map((method) => (
            <option key={method} value={method}>
              {tPaymentMethod(method)}
            </option>
          ))}
        </select>
      </div>

      {paymentMethod === PaymentMethod.QR && (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-zinc-300 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {t("qrPlaceholder")}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="amountPaid" className="text-sm font-medium">
          {t("amountPaid")}
        </label>
        <input
          id="amountPaid"
          name="amountPaid"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={0}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      {saleType !== SaleType.CASH && (
        <div className="flex flex-col gap-1">
          <label htmlFor="deliveryDate" className="text-sm font-medium">
            {t("expectedDate")}
          </label>
          <input
            id="deliveryDate"
            name="deliveryDate"
            type="date"
            required
            className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="customerName" className="text-sm font-medium">
          {t("customerName")}
        </label>
        <input
          id="customerName"
          name="customerName"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customerPhone" className="text-sm font-medium">
          {t("customerPhone")}
        </label>
        <input
          id="customerPhone"
          name="customerPhone"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium">
          {t("notes")}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>

      {state?.success === false && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error === "Forbidden"
            ? tCommon("errorForbidden")
            : state.error === "insufficient_stock"
              ? t("errorInsufficientStock")
              : tCommon("errorValidation")}
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
