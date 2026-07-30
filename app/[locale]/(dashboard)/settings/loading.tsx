import { getTranslations } from "next-intl/server";
import {
  LoadingRegion,
  HeaderSkeleton,
  FormSkeleton,
} from "@/components/ui/page-skeletons";

export default async function SettingsLoading() {
  const t = await getTranslations("Common");

  return (
    <LoadingRegion label={t("loading")}>
      <HeaderSkeleton actions={0} />
      <FormSkeleton fields={3} />
    </LoadingRegion>
  );
}
