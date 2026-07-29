import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { listMaterials } from "@/lib/inventory";
import { Link } from "@/i18n/navigation";
import { DeleteMaterialButton } from "@/components/materials/delete-material-button";
import { DeactivateMaterialButton } from "@/components/materials/deactivate-material-button";
import { ReactivateMaterialButton } from "@/components/materials/reactivate-material-button";
import { formatCurrency } from "@/lib/currency";
import { zonedTimeToUtc } from "@/lib/timezone";
import { History, Pencil } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { IconButtonLink } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { MutedText } from "@/components/ui/muted-text";

type Props = {
  searchParams: Promise<{ q?: string; from?: string; to?: string; tab?: string }>;
};

// Preserves the current filters across the tab links and the current
// tab across the filter form submit — same idea as the Products list's
// buildHref (app/[locale]/(dashboard)/inventory/products/page.tsx).
function buildHref(
  filters: { q?: string; from?: string; to?: string },
  tab?: "inactive",
) {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  if (tab) query.tab = tab;
  return { pathname: "/inventory/materials" as const, query };
}

export default async function MaterialsPage({ searchParams }: Props) {
  const { q, from, to, tab } = await searchParams;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const isInactiveTab = tab === "inactive";

  // Date-only inputs interpreted as midnight in *this user's* configured
  // timezone, not the server's local time (05-nextjs-conventions.md
  // "Timezone handling").
  const timeZone = session!.user.settings.timezone;
  const createdFrom = from ? zonedTimeToUtc(from, timeZone) : undefined;
  const createdTo = to
    ? zonedTimeToUtc(to, timeZone, {
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      })
    : undefined;

  const materials = await listMaterials({
    search: q,
    createdFrom,
    createdTo,
    active: !isInactiveTab,
  });

  const t = await getTranslations("Materials");
  const tCommon = await getTranslations("Common");
  const tUnit = await getTranslations("Unit");
  const tCity = await getTranslations("City");
  const tHistory = await getTranslations("MaterialHistory");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {isAdmin && (
          <ButtonLink href="/inventory/materials/new">
            {t("addNew")}
          </ButtonLink>
        )}
      </div>

      <div className="flex gap-4 border-b border-border">
        <Link
          href={buildHref({ q, from, to })}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isInactiveTab
              ? "border-transparent text-muted-foreground hover:text-foreground"
              : "border-primary"
          }`}
        >
          {t("tabActive")}
        </Link>
        <Link
          href={buildHref({ q, from, to }, "inactive")}
          className={`border-b-2 px-1 pb-2 text-sm font-medium transition-colors duration-200 ease-in-out ${
            isInactiveTab
              ? "border-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabInactive")}
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        {isInactiveTab && <input type="hidden" name="tab" value="inactive" />}
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={t("searchPlaceholder")}
          className="w-full max-w-sm"
        />
        <FormField label={t("createdFrom")} htmlFor="from">
          <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
        </FormField>
        <FormField label={t("createdTo")} htmlFor="to">
          <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
        </FormField>
        <Button type="submit" variant="secondary">
          {tCommon("search")}
        </Button>
      </form>

      {materials.length === 0 ? (
        <MutedText>{tCommon("empty")}</MutedText>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">{t("materialType")}</th>
                <th className="p-2">{t("type")}</th>
                <th className="p-2">{t("color")}</th>
                <th className="p-2">{t("quantity")}</th>
                <th className="p-2">{t("unit")}</th>
                <th className="p-2">{t("city")}</th>
                <th className="p-2">{t("purchasePrice")}</th>
                <th className="p-2">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id} className="border-b border-border/50">
                  <td className="p-2">{material.materialType}</td>
                  <td className="p-2">{material.type}</td>
                  <td className="p-2">{material.color ?? "—"}</td>
                  <td className="p-2">{material.quantity.toString()}</td>
                  <td className="p-2">{tUnit(material.unit)}</td>
                  <td className="p-2">{tCity(material.city)}</td>
                  <td className="p-2">
                    {formatCurrency(material.purchasePrice.toString())}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <IconButtonLink
                        href={`/inventory/materials/${material.id}/history`}
                        icon={<History className="size-5" />}
                        label={tHistory("linkLabel")}
                      />
                      {isAdmin && (
                        <>
                          <IconButtonLink
                            href={`/inventory/materials/${material.id}/edit`}
                            icon={<Pencil className="size-5" />}
                            label={tCommon("edit")}
                          />
                          {material.active ? (
                            <DeactivateMaterialButton id={material.id} />
                          ) : (
                            <ReactivateMaterialButton id={material.id} />
                          )}
                          <DeleteMaterialButton id={material.id} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
