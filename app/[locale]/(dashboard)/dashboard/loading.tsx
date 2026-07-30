import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "@/components/ui/page-skeletons";

export default async function DashboardHomeLoading() {
  const t = await getTranslations("Common");

  return (
    <LoadingRegion label={t("loading")}>
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-4 w-40" />
    </LoadingRegion>
  );
}
