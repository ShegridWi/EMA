"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

// Below lg: a hamburger button opens an overlay drawer holding the same
// <NavLinks /> the static sidebar (components/dashboard-nav.tsx) renders
// at lg+ — see that file's comment for why the same server-rendered
// links can be reused in both places. Enter/exit uses framer-motion per
// .claude/skills/motion-and-transitions/SKILL.md (a real mount/unmount
// case, not a plain hover/color transition).
export function MobileNavDrawer({
  children,
  openLabel,
  closeLabel,
}: {
  children: ReactNode;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={openLabel}
        className="flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors duration-200 ease-in-out hover:bg-muted lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.nav
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-4 border-r border-border bg-background p-4 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={closeLabel}
                className="flex size-8 cursor-pointer items-center justify-center self-end rounded-md transition-colors duration-200 ease-in-out hover:bg-muted"
              >
                <X className="size-5" />
              </button>
              {children}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
