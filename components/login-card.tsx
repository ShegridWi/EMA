"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

// A one-time mount animation for the login card — a real "the page just
// appeared" moment, not page-level layout motion (see
// .claude/skills/motion-and-transitions/SKILL.md's "what should NOT
// animate" note against animating layout just because framer-motion is
// available). useReducedMotion() collapses it to an instant appearance
// per that skill's prefers-reduced-motion rule.
export function LoginCard({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-sm rounded-xl border border-border bg-background p-8 shadow-lg sm:p-10"
    >
      {children}
    </motion.div>
  );
}
