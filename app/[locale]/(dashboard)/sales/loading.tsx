import { getTranslations } from "next-intl/server";
import {
  LoadingRegion,
  HeaderSkeleton,
  TabsSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/ui/page-skeletons";

export default async function SalesLoading() {
  const t = await getTranslations("Common");

  return (
    <LoadingRegion label={t("loading")}>
      <HeaderSkeleton actions={1} />
      <TabsSkeleton />
      <FilterBarSkeleton fields={5} />
      <TableSkeleton rows={15} cols={8} />
    </LoadingRegion>
  );
}
