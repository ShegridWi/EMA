import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getPedidoById } from "@/lib/pedidos";
import { getSaleById } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { ButtonLink } from "@/components/ui/button-link";
import { PedidoActions } from "@/components/pedidos/pedido-actions";
import { MutedText } from "@/components/ui/muted-text";
import { MODELS } from "@/lib/landing-catalog";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PedidoDetailPage({ params }: Props) {
  const { id } = await params;
  const pedido = await getPedidoById(id);
  if (!pedido) {
    notFound();
  }

  const session = await auth();
  const isAdmin = session!.user.role === "ADMIN";
  const canClaim = isAdmin || pedido.city === session!.user.city;
  const canManage = isAdmin || pedido.assignedSellerId === session!.user.id;

  const convertedSale = pedido.convertedSaleId
    ? await getSaleById(pedido.convertedSaleId)
    : null;

  const t = await getTranslations("Pedidos");
  const tRequestStatus = await getTranslations("RequestStatus");
  const tRequestKind = await getTranslations("RequestKind");
  const tCity = await getTranslations("City");
  const tSize = await getTranslations("Size");
  const tLanding = await getTranslations("Landing");

  const modelLabel = tLanding(
    MODELS.find((m) => m.key === pedido.model)?.nameKey ?? pedido.model,
  );
  const colorLabel = tLanding(pedido.color);
  const genderLabel = tLanding(
    pedido.gender === "MALE" ? "genderMale" : "genderFemale",
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("detailTitle")}</h1>
        <Link
          href="/pedidos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("backToList")}
        </Link>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t("kind")} value={tRequestKind(pedido.kind)} />
        <Field label={t("status")} value={tRequestStatus(pedido.status)} />
        <Field label={t("customer")} value={pedido.customerName} />
        <Field label={t("customerPhone")} value={pedido.customerPhone} />
        <Field label={t("city")} value={tCity(pedido.city)} />
        <Field
          label={t("productSummary")}
          value={`${genderLabel}, ${modelLabel}, ${colorLabel}${pedido.size ? `, ${tSize(pedido.size)}` : ""}`}
        />
        {pedido.quantity !== null && (
          <Field label={t("quantity")} value={String(pedido.quantity)} />
        )}
        {pedido.estimatedQuantity && (
          <Field
            label={t("quoteEstimatedQuantity")}
            value={pedido.estimatedQuantity}
          />
        )}
        {pedido.usageContext && (
          <Field label={t("quoteUsageContext")} value={pedido.usageContext} />
        )}
        {pedido.desiredTimeframe && (
          <Field
            label={t("quoteDesiredTimeframe")}
            value={pedido.desiredTimeframe}
          />
        )}
        {pedido.additionalDetails && (
          <Field
            label={t("quoteAdditionalDetails")}
            value={pedido.additionalDetails}
          />
        )}
        <div className="col-span-full flex flex-col gap-1">
          <dt className="text-sm font-medium text-muted-foreground">
            {t("notes")}
          </dt>
          <dd className="text-sm whitespace-pre-wrap">{pedido.notes}</dd>
        </div>
        <Field
          label={t("assignedTo")}
          value={pedido.assignedSeller?.name ?? t("noneAssigned")}
        />
      </dl>

      {convertedSale && (
        <MutedText>
          {t("convertedSaleLinkPrefix")}{" "}
          <Link
            href={`/sales/${convertedSale.id}`}
            className="underline hover:text-foreground"
          >
            {t("convertedSaleLink")}
          </Link>
        </MutedText>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <PedidoActions
          pedidoId={pedido.id}
          status={pedido.status}
          canClaim={canClaim}
          canManage={canManage}
          isAdmin={isAdmin}
        />
        {pedido.status === "ATTENDED" && canManage && (
          <ButtonLink
            href={{
              pathname: "/sales/new",
              query: { pedidoId: pedido.id },
            }}
          >
            {t("generateSale")}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}
