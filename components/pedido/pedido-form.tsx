"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Loader2, Send } from "lucide-react";
import { submitPedidoAction } from "@/lib/actions/pedidos";
import { Alert } from "@/components/ui/alert";
import { MODELS, type CityKey, type Gender, type ModelKey, type Size } from "@/lib/landing-catalog";

type ActionResult =
  | { success: true; data: unknown }
  | { success: false; error: unknown }
  | null;

// Distinct, bigger, more visual treatment than the rest of the admin app
// on purpose (this is the public landing surface, not an internal
// system form) — raw inputs styled directly with the same semantic
// color tokens the shared Input/Textarea use internally
// (bg-background/text-foreground/border-border/ring-ring), same as
// landing-hero.tsx's own custom-styled controls, rather than the shared
// components/ui primitives sized for dense admin tables.
const FIELD_CLASSES =
  "w-full rounded-2xl border-2 border-border bg-background px-5 py-3.5 text-base text-foreground transition-colors duration-200 ease-in-out placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-ring/30";

function BigLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold tracking-wide text-muted-foreground uppercase"
    >
      {children}
    </label>
  );
}

export function PedidoForm({
  mode,
  gender,
  model,
  colorNameKey,
  size,
  city,
}: {
  mode: "order" | "quote";
  gender: Gender;
  model: ModelKey;
  colorNameKey: string;
  size: Size | null;
  city: CityKey;
}) {
  const t = useTranslations("Pedido");
  const tCommon = useTranslations("Common");
  const tLanding = useTranslations("Landing");
  const router = useRouter();

  const genderLabel = tLanding(gender === "male" ? "genderMale" : "genderFemale");
  const modelLabel = tLanding(MODELS.find((entry) => entry.key === model)!.nameKey);
  const colorLabel = tLanding(colorNameKey);
  const sizeLabel = size ?? t("summaryUnspecified");

  const defaultNotes = t("notesSummaryTemplate", {
    gender: genderLabel,
    model: modelLabel,
    color: colorLabel,
    size: sizeLabel,
  });

  async function action(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
    const payload = {
      customerName: formData.get("customerName"),
      customerPhone: formData.get("customerPhone"),
      notes: formData.get("notes"),
      gender: gender === "male" ? "MALE" : "FEMALE",
      model,
      color: colorNameKey,
      city,
      ...(mode === "order"
        ? {
            size: size ?? undefined,
            quantity: formData.get("quantity") || undefined,
          }
        : {
            estimatedQuantity: formData.get("estimatedQuantity") || undefined,
            usageContext: formData.get("usageContext") || undefined,
            desiredTimeframe: formData.get("desiredTimeframe") || undefined,
            additionalDetails: formData.get("additionalDetails") || undefined,
          }),
      website: formData.get("website") || undefined,
    };

    return submitPedidoAction(payload);
  }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);

  useEffect(() => {
    if (state?.success) {
      router.push("/pedido/confirmacion");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-3xl border border-border bg-muted/40 p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {mode === "order" ? t("formTitleOrder") : t("formTitleQuote")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("formDescription")}</p>
      </div>

      {/* Honeypot: off-screen, never visible/reachable to a real visitor.
          Any bot that blindly fills every input trips this, and the
          server-side action silently no-ops instead of rejecting it
          outright (see submitPedidoAction). */}
      <div className="h-0 w-0 overflow-hidden" aria-hidden>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-2">
        <BigLabel htmlFor="customerName">{t("customerNameLabel")}</BigLabel>
        <input
          id="customerName"
          name="customerName"
          required
          maxLength={200}
          className={FIELD_CLASSES}
        />
      </div>

      <div className="flex flex-col gap-2">
        <BigLabel htmlFor="customerPhone">{t("customerPhoneLabel")}</BigLabel>
        <input
          id="customerPhone"
          name="customerPhone"
          type="tel"
          required
          maxLength={40}
          className={FIELD_CLASSES}
        />
      </div>

      {mode === "order" && (
        <div className="flex flex-col gap-2">
          <BigLabel htmlFor="quantity">{t("quantityLabel")}</BigLabel>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step={1}
            defaultValue={1}
            required
            className={FIELD_CLASSES}
          />
        </div>
      )}

      {mode === "quote" && (
        <>
          <div className="flex flex-col gap-2">
            <BigLabel htmlFor="estimatedQuantity">{t("quoteEstimatedQuantityLabel")}</BigLabel>
            <input id="estimatedQuantity" name="estimatedQuantity" maxLength={200} className={FIELD_CLASSES} />
          </div>
          <div className="flex flex-col gap-2">
            <BigLabel htmlFor="usageContext">{t("quoteUsageContextLabel")}</BigLabel>
            <input id="usageContext" name="usageContext" maxLength={200} className={FIELD_CLASSES} />
          </div>
          <div className="flex flex-col gap-2">
            <BigLabel htmlFor="desiredTimeframe">{t("quoteDesiredTimeframeLabel")}</BigLabel>
            <input id="desiredTimeframe" name="desiredTimeframe" maxLength={200} className={FIELD_CLASSES} />
          </div>
          <div className="flex flex-col gap-2">
            <BigLabel htmlFor="additionalDetails">{t("quoteAdditionalDetailsLabel")}</BigLabel>
            <textarea
              id="additionalDetails"
              name="additionalDetails"
              rows={3}
              maxLength={2000}
              className={FIELD_CLASSES}
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <BigLabel htmlFor="notes">{t("notesLabel")}</BigLabel>
        <textarea
          id="notes"
          name="notes"
          required
          rows={4}
          maxLength={2000}
          defaultValue={defaultNotes}
          className={FIELD_CLASSES}
        />
        <p className="text-xs text-muted-foreground">{t("notesHint")}</p>
      </div>

      {mode === "order" && (
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
          {t("orderHelperMoreModels")}
        </p>
      )}

      {state?.success === false && (
        <Alert>
          {state.error === "rate_limited" ? t("errorRateLimited") : tCommon("errorValidation")}
        </Alert>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors duration-200 ease-in-out hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Send className="size-5 transition-transform duration-200 ease-in-out group-hover:translate-x-0.5" />
        )}
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
