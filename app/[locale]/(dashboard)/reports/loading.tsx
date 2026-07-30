import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LoadingRegion,
  HeaderSkeleton,
  FilterBarSkeleton,
} from "@/components/ui/page-skeletons";

export default async function ReportsLoading() {
  const t = await getTranslations("Common");

  return (
    <LoadingRegion label={t("loading")}>
      <HeaderSkeleton actions={0} />
      <Skeleton className="h-4 w-full max-w-prose" />
      <FilterBarSkeleton fields={2} withSearch={false} />
    </LoadingRegion>
  );
}
