"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CheckCircle2 } from "lucide-react";

const REDIRECT_DELAY_MS = 5000;

// Full-page confirmation (explicitly NOT a modal/toast, per spec) shown
// right after a successful pedido/cotización submission. Auto-redirects
// to the landing page after a few seconds.
export default function PedidoConfirmationPage() {
  const t = useTranslations("Pedido");
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.push("/");
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <CheckCircle2 className="size-16 text-primary" strokeWidth={1.5} />
      <h1 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
        {t("confirmationTitle")}
      </h1>
      <p className="max-w-md text-base text-muted-foreground">{t("confirmationBody")}</p>
    </section>
  );
}
