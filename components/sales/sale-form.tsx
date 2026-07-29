"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createSaleAction } from "@/lib/actions/sales";
import { useToast } from "@/components/ui/toast-provider";
import { City, SaleType, PaymentMethod } from "@/app/generated/prisma/enums";
import type { SerializedProduct } from "@/lib/inventory";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { MutedText } from "@/components/ui/muted-text";

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
    return <MutedText>{tCommon("empty")}</MutedText>;
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <FormField label={t("product")} htmlFor="productId">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder={t("searchProductPlaceholder")}
            className="w-full rounded-md border border-border bg-background py-2 pr-3 pl-9 text-sm text-foreground transition-colors duration-200 ease-in-out placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/*
          Quick-pick results list under the search box. Clicking a row
          just updates `productId` — the same state the <select> below
          reads — so the dropdown's selection updates automatically
          without any extra wiring. Each row (and each <option>) shows
          whether the product is a Set or a Unit, since that isn't
          obvious from the description alone.
        */}
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {filteredProducts.length === 0 ? (
            <MutedText className="p-2 text-xs">
              {t("searchResultsEmpty")}
            </MutedText>
          ) : (
            <ul className="divide-y divide-border">
              {filteredProducts.map((product) => {
                const isSelected = product.id === effectiveProductId;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => setProductId(product.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-200 ease-in-out hover:bg-muted ${
                        isSelected ? "bg-muted" : ""
                      }`}
                    >
                      <span>
                        {product.description} ({product.color}, {product.size})
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {product.kind === "SET" ? t("kindSet") : t("kindUnit")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Select
          id="productId"
          name="productId"
          required
          value={effectiveProductId}
          onChange={(e) => setProductId(e.target.value)}
        >
          {filteredProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.description} ({product.color}, {product.size}) —{" "}
              {product.kind === "SET" ? t("kindSet") : t("kindUnit")}
            </option>
          ))}
        </Select>
        {selectedProduct && (
          <MutedText className="text-xs">
            {selectedProduct.kind === "UNIT"
              ? t("unitAvailable", { count: selectedProduct.quantity })
              : t("setNoStockShown")}
          </MutedText>
        )}
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("quantity")} htmlFor="quantity">
          <Input
            id="quantity"
            name="quantity"
            type="number"
            step="1"
            min="1"
            required
            defaultValue={1}
          />
        </FormField>

        <FormField label={t("unitPrice")} htmlFor="unitPrice">
          <Input
            key={selectedProduct?.id}
            id="unitPrice"
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={selectedProduct?.price}
          />
        </FormField>
      </div>

      <input
        type="hidden"
        name="city"
        value={selectedProduct?.city ?? City.LA_PAZ}
      />
      <MutedText className="text-xs">
        {t("city")}: {selectedProduct ? tCity(selectedProduct.city) : "—"}
      </MutedText>

      <FormField label={t("saleDate")} htmlFor="saleDate">
        <Input
          id="saleDate"
          name="saleDate"
          type="date"
          required
          defaultValue={todayStr}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("saleType")} htmlFor="saleType">
          <Select
            id="saleType"
            name="saleType"
            required
            value={saleType}
            onChange={(e) => setSaleType(e.target.value)}
          >
            {Object.values(SaleType).map((type) => (
              <option key={type} value={type}>
                {tSaleType(type)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t("paymentMethod")} htmlFor="paymentMethod">
          <Select
            id="paymentMethod"
            name="paymentMethod"
            required
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {Object.values(PaymentMethod).map((method) => (
              <option key={method} value={method}>
                {tPaymentMethod(method)}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {paymentMethod === PaymentMethod.QR && (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
          {t("qrPlaceholder")}
        </div>
      )}

      <FormField label={t("amountPaid")} htmlFor="amountPaid">
        <Input
          id="amountPaid"
          name="amountPaid"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={0}
        />
      </FormField>

      {saleType !== SaleType.CASH && (
        <FormField label={t("expectedDate")} htmlFor="deliveryDate">
          <Input id="deliveryDate" name="deliveryDate" type="date" required />
        </FormField>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("customerName")} htmlFor="customerName">
          <Input id="customerName" name="customerName" />
        </FormField>

        <FormField label={t("customerPhone")} htmlFor="customerPhone">
          <Input id="customerPhone" name="customerPhone" />
        </FormField>
      </div>

      <FormField label={t("notes")} htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} />
      </FormField>

      {state?.success === false && (
        <Alert>
          {state.error === "Forbidden"
            ? tCommon("errorForbidden")
            : state.error === "insufficient_stock"
              ? t("errorInsufficientStock")
              : tCommon("errorValidation")}
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
