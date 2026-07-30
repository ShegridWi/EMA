import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listPedidos } from "@/lib/pedidos";
import { Link } from "@/i18n/navigation";
import { PedidoActions } from "@/components/pedidos/pedido-actions";
import { IconButtonLink } from "@/components/ui/icon-button";
import { MutedText } from "@/components/ui/muted-text";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { City, RequestKind } from "@/app/generated/prisma/enums";
import { MODELS } from "@/lib/landing-catalog";
import { ShoppingCart, Eye } from "lucide-react";

type Props = {
  searchParams: Promise<{
    tab?: string;
    kind?: string;
    city?: string;
  }>;
};

function buildHref(filters: { kind?: string; city?: string }, tab?: "all") {
  const query: Record<string, string> = {};
  if (filters.kind) query.kind = filters.kind;
  if (filters.city) query.city = filters.city;
  if (tab) query.tab = tab;
  return { pathname: "/pedidos" as const, query };
}

export default async function PedidosPage({ searchParams }: Props) {
  const { tab, kind, city } = await searchParams;
  const isAllTab = tab === "all";

  const session = await auth();
  const isAdmin = session!.user.role === "ADMIN";

  const kindFilter =
    kind && (Object.values(RequestKind) as string[]).includes(kind)
      ? (kind as RequestKind)
      : undefined;
  const cityFilter =
    isAdmin && city && (Object.values(City) as string[]).includes(city)
      ? (city as City)
      : undefined;

  const pedidos = await listPedidos({
    city: isAdmin ? cityFilter : session!.user.city,
    status: isAllTab ? undefined : "PENDING",
    kind: kindFilter,
  });

  const t = await getTranslations("Pedidos");
  const tCommon = await getTranslations("Common");
  const tRequestStatus = await getTranslations("RequestStatus");
  const tRequestKind = await getTranslations("RequestKind");
  const tCity = await getTranslations("City");
  const tSize = await getTranslations("Size");
  const tLanding = await getTranslations("Landing");

  const filterHrefState = { kind, city };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>

      <div className="flex gap-4 border-b border-border">
        <Link
          href={buildHref(filterHrefState)}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isAllTab
              ? "border-transparent text-muted-foreground hover:text-foreground"
              : "border-primary"
          }`}
        >
          {t("tabPending")}
        </Link>
        <Link
          href={buildHref(filterHrefState, "all")}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isAllTab
              ? "border-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabAll")}
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        {isAllTab && <input type="hidden" name="tab" value="all" />}
        <FormField label={t("kind")} htmlFor="kind">
          <Select id="kind" name="kind" defaultValue={kindFilter ?? ""}>
            <option value="">{t("kindAll")}</option>
            {Object.values(RequestKind).map((value) => (
              <option key={value} value={value}>
                {tRequestKind(value)}
              </option>
            ))}
          </Select>
        </FormField>
        {isAdmin && (
          <FormField label={t("city")} htmlFor="city">
            <Select id="city" name="city" defaultValue={cityFilter ?? ""}>
              <option value="">{t("cityAll")}</option>
              {Object.values(City).map((value) => (
                <option key={value} value={value}>
                  {tCity(value)}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <Button type="submit" variant="secondary">
          {tCommon("search")}
        </Button>
      </form>

      {pedidos.length === 0 ? (
        <MutedText>{tCommon("empty")}</MutedText>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">{t("kind")}</th>
                <th className="p-2">{t("status")}</th>
                <th className="p-2">{t("customer")}</th>
                <th className="p-2">{t("productSummary")}</th>
                <th className="p-2">{t("city")}</th>
                <th className="p-2">{t("assignedTo")}</th>
                <th className="p-2">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => {
                const modelLabel = tLanding(
                  MODELS.find((m) => m.key === pedido.model)?.nameKey ?? pedido.model,
                );
                const colorLabel = tLanding(pedido.color);
                const canClaim = isAdmin || pedido.city === session!.user.city;
                const canManage =
                  isAdmin || pedido.assignedSellerId === session!.user.id;

                return (
                  <tr key={pedido.id} className="border-b border-border/50">
                    <td className="p-2">{tRequestKind(pedido.kind)}</td>
                    <td className="p-2">{tRequestStatus(pedido.status)}</td>
                    <td className="p-2">
                      <div className="flex flex-col">
                        <span>{pedido.customerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {pedido.customerPhone}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      {modelLabel}, {colorLabel}
                      {pedido.size ? `, ${tSize(pedido.size)}` : ""}
                    </td>
                    <td className="p-2">{tCity(pedido.city)}</td>
                    <td className="p-2">
                      {pedido.assignedSeller?.name ?? t("noneAssigned")}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <IconButtonLink
                          href={`/pedidos/${pedido.id}`}
                          icon={<Eye className="size-5" />}
                          label={t("view")}
                        />
                        {pedido.status === "ATTENDED" && canManage && (
                          <IconButtonLink
                            href={{
                              pathname: "/sales/new",
                              query: {
                                pedidoId: pedido.id,
                                ...(pedido.quantity ? { quantity: String(pedido.quantity) } : {}),
                                customerName: pedido.customerName,
                                customerPhone: pedido.customerPhone,
                                notes: pedido.notes,
                              },
                            }}
                            icon={<ShoppingCart className="size-5" />}
                            label={t("generateSale")}
                          />
                        )}
                        <PedidoActions
                          pedidoId={pedido.id}
                          status={pedido.status}
                          canClaim={canClaim}
                          canManage={canManage}
                          isAdmin={isAdmin}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
