"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { productImagePath, randomCatalogCombo } from "@/lib/landing-catalog";

// Used on the pedido/cotización page when the visitor arrives with no
// gender/model/color selected at all — automatically swaps between
// random valid catalog combinations every 5s. No carousel UI/controls,
// purely a background effect (explicitly requested — see the plan).
export function RandomImageCycler({ alt }: { alt: string }) {
  const reduceMotion = useReducedMotion();
  const [combo, setCombo] = useState(() => randomCatalogCombo());

  useEffect(() => {
    const interval = setInterval(() => {
      setCombo((current) => {
        let next = randomCatalogCombo();
        // Re-roll once if it lands on the same combo, so every tick is a
        // visible change.
        if (
          next.gender === current.gender &&
          next.model === current.model &&
          next.colorNameKey === current.colorNameKey
        ) {
          next = randomCatalogCombo();
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const src = productImagePath(combo.gender, combo.model, combo.colorNameKey);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
      <AnimatePresence>
        <motion.div
          key={src}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 520px, 90vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
