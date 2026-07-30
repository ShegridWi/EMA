import { getTranslations } from "next-intl/server";
import {
  LoadingRegion,
  HeaderSkeleton,
  TabsSkeleton,
  FilterBarSkeleton,
  CardListSkeleton,
} from "@/components/ui/page-skeletons";

export default async function ProductsLoading() {
  const t = await getTranslations("Common");

  return (
    <LoadingRegion label={t("loading")}>
      <HeaderSkeleton actions={3} />
      <TabsSkeleton />
      <FilterBarSkeleton fields={3} />
      <CardListSkeleton items={10} />
    </LoadingRegion>
  );
}
