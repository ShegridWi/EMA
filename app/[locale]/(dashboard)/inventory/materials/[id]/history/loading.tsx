import { getTranslations } from "next-intl/server";
import {
  LoadingRegion,
  BackLinkHeaderSkeleton,
  TableSkeleton,
} from "@/components/ui/page-skeletons";

export default async function MaterialHistoryLoading() {
  const t = await getTranslations("Common");

  return (
    <LoadingRegion label={t("loading")}>
      <BackLinkHeaderSkeleton />
      <TableSkeleton rows={6} cols={6} />
    </LoadingRegion>
  );
}
