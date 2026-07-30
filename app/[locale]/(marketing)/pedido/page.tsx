import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PedidoForm } from "@/components/pedido/pedido-form";
import { RandomImageCycler } from "@/components/pedido/random-image-cycler";
import {
  HERO_ALT_KEYS,
  MODELS,
  PALETTE,
  productImagePath,
  isCityKey,
  isColorForGender,
  isModelKey,
  isSize,
  type CityKey,
  type Gender,
  type ModelKey,
} from "@/lib/landing-catalog";

type Props = {
  searchParams: Promise<{
    gender?: string;
    model?: string;
    color?: string;
    size?: string;
    city?: string;
  }>;
};

function resolveGender(value: string | undefined): Gender {
  return value === "female" ? "female" : "male";
}

export default async function PedidoPage({ searchParams }: Props) {
  const params = await searchParams;
  const gender = resolveGender(params.gender);
  const model: ModelKey = params.model && isModelKey(params.model) ? params.model : MODELS[0].key;
  const colorNameKey =
    params.color && isColorForGender(gender, params.color)
      ? params.color
      : PALETTE[gender][0].nameKey;
  const size = params.size && isSize(params.size) ? params.size : null;
  const city: CityKey = params.city && isCityKey(params.city) ? params.city : "LA_PAZ";

  const mode: "order" | "quote" = size ? "order" : "quote";
  const hasFullSelection = Boolean(params.gender && params.model && params.color);

  const t = await getTranslations("Landing");

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8 lg:py-16">
      <span className="text-xl font-bold tracking-tight">
        {t("brand")}
        <span className="text-primary">.</span>
      </span>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-primary/10 lg:sticky lg:top-10">
          {hasFullSelection ? (
            <Image
              src={productImagePath(gender, model, colorNameKey)}
              alt={t(HERO_ALT_KEYS[gender])}
              fill
              priority
              sizes="(min-width: 1024px) 520px, 90vw"
              className="object-cover"
            />
          ) : (
            <RandomImageCycler alt={t(HERO_ALT_KEYS[gender])} />
          )}
        </div>

        <PedidoForm
          mode={mode}
          gender={gender}
          model={model}
          colorNameKey={colorNameKey}
          size={size}
          city={city}
        />
      </div>
    </section>
  );
}
