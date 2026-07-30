"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Camera,
  ChevronDown,
  Droplets,
  LogIn,
  MessageCircle,
  Ruler,
  ThumbsUp,
  User,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import {
  HERO_ALT_KEYS,
  MODELS,
  PALETTE,
  SIZES,
  productImagePath,
  type CityKey,
  type Gender,
  type ModelKey,
  type Size,
} from "@/lib/landing-catalog";

// Base measurements (cm) per gender, before the selected model's fit
// adjustment is applied — see MODEL_FIT_DELTA below. Placeholder chart;
// the client will supply the real one per garment later.
const SIZE_GUIDE_BASE: Record<Gender, Record<Size, { chest: number; waist: number; length: number }>> = {
  male: {
    XS: { chest: 86, waist: 68, length: 66 },
    S: { chest: 92, waist: 74, length: 68 },
    M: { chest: 98, waist: 80, length: 70 },
    L: { chest: 104, waist: 86, length: 72 },
    XL: { chest: 110, waist: 92, length: 74 },
    XXL: { chest: 118, waist: 100, length: 76 },
  },
  female: {
    XS: { chest: 82, waist: 62, length: 62 },
    S: { chest: 87, waist: 67, length: 64 },
    M: { chest: 92, waist: 72, length: 66 },
    L: { chest: 98, waist: 78, length: 68 },
    XL: { chest: 104, waist: 84, length: 70 },
    XXL: { chest: 111, waist: 91, length: 72 },
  },
};

// Each model's cut nudges the base chart by a few cm instead of every
// model needing its own full chart — e.g. "Slim Fit" runs a bit closer to
// the body, "Oversize" a bit roomier. Placeholder deltas; replace with the
// client's real per-model measurements later.
const MODEL_FIT_DELTA: Record<ModelKey, { chest: number; waist: number; length: number }> = {
  clasico: { chest: 0, waist: 0, length: 0 },
  slim: { chest: -3, waist: -3, length: -1 },
  oversize: { chest: 4, waist: 4, length: 2 },
  cargo: { chest: 1, waist: 1, length: 1 },
  quirurgico: { chest: 0, waist: 0, length: 0 },
  deportivo: { chest: -2, waist: -1, length: -1 },
  premium: { chest: 0, waist: 0, length: 1 },
  ergonomico: { chest: 2, waist: 2, length: 0 },
};

// Map pins for the two cities the business operates in (CLAUDE.md
// section 3). Contact details currently repeat across both — same
// person handles both cities for now — but this stays keyed by city so
// a future per-city contact is a one-line edit, not a restructure.
const LOCATIONS: Record<
  CityKey,
  { lat: number; lng: number; contactName: string; whatsapp: string; instagram: string; facebook: string }
> = {
  LA_PAZ: {
    lat: -16.499776,
    lng: -68.121087,
    contactName: "Solange Galarza",
    whatsapp: "59172080108",
    instagram: "https://instagram.com/pijamamedifaeuforia",
    facebook: "https://facebook.com/pijamamedifaeuforia",
  },
  SANTA_CRUZ: {
    lat: -17.784885,
    lng: -63.170283,
    contactName: "Solange Galarza",
    whatsapp: "59172080108",
    instagram: "https://instagram.com/pijamamedifaeuforia",
    facebook: "https://facebook.com/pijamamedifaeuforia",
  },
};

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export function LandingHero() {
  const t = useTranslations("Landing");
  const reduceMotion = useReducedMotion();
  const tCity = useTranslations("City");
  const [gender, setGender] = useState<Gender>("male");
  const [selectedSize, setSelectedSize] = useState<Size | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelKey>(MODELS[0].key);
  const [selectedColor, setSelectedColor] = useState(PALETTE.male[0].nameKey);
  const [city, setCity] = useState<CityKey>("LA_PAZ");
  const location = LOCATIONS[city];
  const mapSrc = `https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`;

  // The palette differs per gender (PALETTE.male vs .female), so a color
  // selected under one gender may not exist under the other — reset to
  // that gender's first color whenever the gender toggle changes, right
  // in the handler rather than reactively in an effect.
  function handleGenderChange(next: Gender) {
    setGender(next);
    setSelectedColor(PALETTE[next][0].nameKey);
  }

  const productImage = productImagePath(gender, selectedModel, selectedColor);

  return (
    <section className="relative overflow-hidden bg-background px-4 py-8 sm:px-8 lg:px-16 lg:py-16">
      {/* Ambient decoration only — purely visual, not tied to any state
          change (explicitly requested for this one public splash page;
          see .claude/skills/motion-and-transitions/SKILL.md's default
          against decorative motion, which this intentionally overrides). */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-secondary/20 blur-3xl"
        animate={reduceMotion ? undefined : { x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-12">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-xl font-bold tracking-tight">
            {t("brand")}
            <span className="text-primary">.</span>
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <GenderToggle value={gender} onChange={handleGenderChange} />
            <LanguageToggle />
            <ThemeToggle />
            <Link
              href="/login"
              title={t("ctaAria")}
              aria-label={t("ctaAria")}
              className="group inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border text-foreground transition-colors duration-200 ease-in-out hover:border-primary hover:text-primary"
            >
              <LogIn className="size-5" />
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr_0.9fr] lg:items-center lg:gap-10">
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={containerVariants}
            className="flex flex-col gap-6"
          >
            <motion.span
              variants={itemVariants}
              className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold tracking-wide text-primary uppercase"
            >
              {t("badge")}
            </motion.span>

            <motion.h1
              variants={itemVariants}
              className="text-6xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-7xl lg:text-8xl"
            >
              <span className="block">{t("titleLine1")}</span>
              <span className="block">{t("titleLine2")}</span>
              <span className="block text-primary">{t("titleLine3")}</span>
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-2 text-lg font-medium text-secondary"
            >
              <span>{t("tagline")} ·</span>
              <CityToggle value={city} onChange={setCity} />
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="max-w-md text-base text-muted-foreground"
            >
              {t("description")}
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="overflow-hidden rounded-lg border border-border">
                <iframe
                  key={city}
                  title={tCity(city)}
                  src={mapSrc}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="block h-40 w-full border-0 sm:h-full"
                />
              </div>
              <div className="flex flex-col justify-center gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <User className="size-4 text-primary" />
                  {location.contactName}
                </span>
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/${location.whatsapp}`}
                    title={t("whatsappLabel")}
                    aria-label={t("whatsappLabel")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-foreground transition-colors duration-200 ease-in-out hover:border-primary hover:text-primary"
                  >
                    <MessageCircle className="size-5" />
                  </a>
                  <a
                    href={location.instagram}
                    title={t("instagramLabel")}
                    aria-label={t("instagramLabel")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-foreground transition-colors duration-200 ease-in-out hover:border-primary hover:text-primary"
                  >
                    <Camera className="size-5" />
                  </a>
                  <a
                    href={location.facebook}
                    title={t("facebookLabel")}
                    aria-label={t("facebookLabel")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-foreground transition-colors duration-200 ease-in-out hover:border-primary hover:text-primary"
                  >
                    <ThumbsUp className="size-5" />
                  </a>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col">
              <AccordionRow title={t("accordionMaterialsTitle")}>
                <p className="pb-3.5 text-sm text-muted-foreground">
                  {t("accordionMaterialsBody")}
                </p>
              </AccordionRow>
              <AccordionRow title={t("accordionSizesTitle")}>
                <p className="pb-3.5 text-sm text-muted-foreground">
                  {t("accordionSizesBody")}
                </p>
              </AccordionRow>
            </motion.div>
          </motion.div>

          <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center">
            <motion.span
              aria-hidden
              className="absolute size-[88%] rounded-full border border-dashed border-primary/30"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            />
            <motion.span
              aria-hidden
              className="absolute size-[72%] rounded-full border border-dashed border-secondary/30"
              animate={reduceMotion ? undefined : { rotate: -360 }}
              transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative aspect-[3/4] w-[70%] overflow-hidden rounded-[2rem] border border-border shadow-2xl shadow-primary/10">
              <AnimatePresence>
                <motion.div
                  key={productImage}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <motion.div
                    animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative h-full w-full"
                  >
                    <Image
                      src={productImage}
                      alt={t(HERO_ALT_KEYS[gender])}
                      fill
                      priority
                      sizes="(min-width: 1024px) 380px, 60vw"
                      className="object-cover"
                    />
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={containerVariants}
            className="flex flex-col gap-7 rounded-2xl border border-border bg-muted/40 p-7"
          >
            <motion.div variants={itemVariants}>
              <p className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {t("sizesLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setSelectedSize((current) =>
                          current === size ? null : size,
                        )
                      }
                      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ease-in-out ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary hover:text-primary"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence initial={false}>
                {selectedSize && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                      <table className="w-full min-w-[280px] text-left text-xs">
                        <caption className="sr-only">{t("sizeGuideTitle")}</caption>
                        <thead>
                          <tr className="border-b border-border bg-background/60">
                            <th className="p-2 font-semibold"> </th>
                            <th className="p-2 font-semibold">{t("sizeGuideChest")}</th>
                            <th className="p-2 font-semibold">{t("sizeGuideWaist")}</th>
                            <th className="p-2 font-semibold">{t("sizeGuideLength")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {SIZES.map((size) => {
                            const base = SIZE_GUIDE_BASE[gender][size];
                            const delta = MODEL_FIT_DELTA[selectedModel];
                            return (
                              <tr
                                key={size}
                                className={`border-b border-border/50 last:border-0 ${
                                  size === selectedSize ? "text-primary" : ""
                                }`}
                              >
                                <td className="p-2 font-semibold">{size}</td>
                                <td className="p-2">{base.chest + delta.chest}</td>
                                <td className="p-2">{base.waist + delta.waist}</td>
                                <td className="p-2">{base.length + delta.length}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {t("modelsLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {MODELS.map((model) => {
                  const isSelected = selectedModel === model.key;
                  return (
                    <button
                      key={model.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedModel(model.key)}
                      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ease-in-out ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary hover:text-primary"
                      }`}
                    >
                      {t(model.nameKey)}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <p className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {t("paletteLabel")}
              </p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={gender}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="flex flex-wrap gap-2"
                >
                  {PALETTE[gender].map((color) => {
                    const isSelected = selectedColor === color.nameKey;
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        title={t(color.nameKey)}
                        aria-label={t(color.nameKey)}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedColor(color.nameKey)}
                        style={{ backgroundColor: color.hex }}
                        className={`size-9 cursor-pointer rounded-full border-2 transition-transform duration-200 ease-in-out hover:scale-110 ${
                          isSelected
                            ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "border-border/50"
                        }`}
                      />
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Link
                href={{
                  pathname: "/pedido",
                  query: {
                    gender,
                    model: selectedModel,
                    color: selectedColor,
                    size: selectedSize ?? "",
                    city,
                  },
                }}
                aria-label={t("quoteCtaAria")}
                className="group inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-colors duration-200 ease-in-out hover:bg-primary/90"
              >
                <MessageCircle
                  className="size-5 transition-transform duration-200 ease-in-out group-hover:translate-x-0.5"
                  strokeWidth={2}
                />
                {t("quoteCta")}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={containerVariants}
          className="flex flex-wrap items-center justify-center gap-8 border-t border-border pt-8 sm:justify-between"
        >
          <FeatureItem icon={Droplets} label={t("feature1")} />
          <FeatureItem icon={Wind} label={t("feature2")} />
          <FeatureItem icon={Ruler} label={t("feature3")} />
        </motion.div>
      </div>
    </section>
  );
}

function GenderToggle({
  value,
  onChange,
}: {
  value: Gender;
  onChange: (value: Gender) => void;
}) {
  const t = useTranslations("Landing");
  const options: { key: Gender; label: string }[] = [
    { key: "male", label: t("genderMale") },
    { key: "female", label: t("genderFemale") },
  ];

  return (
    <div className="relative inline-flex items-center rounded-full border border-border p-1 text-sm font-semibold">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
          className={`relative cursor-pointer rounded-full px-3.5 py-1.5 transition-colors duration-200 ease-in-out ${
            value === option.key
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {value === option.key && (
            <motion.span
              layoutId="gender-toggle-bg"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function AccordionRow({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 py-3.5 text-left text-base font-semibold transition-colors duration-200 ease-in-out hover:text-primary"
      >
        {title}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CityToggle({
  value,
  onChange,
}: {
  value: CityKey;
  onChange: (value: CityKey) => void;
}) {
  const tCity = useTranslations("City");
  const cities: CityKey[] = ["LA_PAZ", "SANTA_CRUZ"];

  return (
    <div className="relative inline-flex items-center rounded-full border border-border p-1 text-sm font-semibold">
      {cities.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`relative cursor-pointer rounded-full px-3.5 py-1.5 transition-colors duration-200 ease-in-out ${
            value === key
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {value === key && (
            <motion.span
              layoutId="city-toggle-bg"
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            />
          )}
          <span className="relative z-10">{tCity(key)}</span>
        </button>
      ))}
    </div>
  );
}

function FeatureItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <motion.div variants={itemVariants} className="flex items-center gap-2.5">
      <Icon className="size-6 text-primary" strokeWidth={1.5} />
      <span className="text-sm font-medium tracking-wide uppercase">
        {label}
      </span>
    </motion.div>
  );
}
