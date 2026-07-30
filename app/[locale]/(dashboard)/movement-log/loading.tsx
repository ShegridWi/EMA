import { getTranslations } from "next-intl/server";
import {
  LoadingRegion,
  HeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/ui/page-skeletons";

export default async function MovementLogLoading() {
  const t = await getTranslations("Common");

  return (
    <LoadingRegion label={t("loading")}>
      <HeaderSkeleton actions={0} />
      <FilterBarSkeleton fields={4} withSearch={false} />
      <TableSkeleton rows={15} cols={5} />
    </LoadingRegion>
  );
}
