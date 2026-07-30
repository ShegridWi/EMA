"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  claimPedidoAction,
  cancelPedidoAction,
  releasePedidoAction,
} from "@/lib/actions/pedidos";
import { PromptModal } from "@/components/ui/prompt-modal";
import { useToast } from "@/components/ui/toast-provider";
import { IconButton } from "@/components/ui/icon-button";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { RequestStatus } from "@/app/generated/prisma/enums";

type PendingAction = "cancel" | "release" | null;

export function PedidoActions({
  pedidoId,
  status,
  canClaim,
  canManage,
  isAdmin,
}: {
  pedidoId: string;
  status: RequestStatus;
  // Whether the current viewer (city/role) is allowed to claim this
  // pedido if it's still PENDING.
  canClaim: boolean;
  // Whether the current viewer is the assigned seller (or an admin) —
  // controls the cancel button on an ATTENDED row.
  canManage: boolean;
  isAdmin: boolean;
}) {
  const t = useTranslations("Pedidos");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  function handleClaim() {
    startTransition(async () => {
      const result = await claimPedidoAction({ id: pedidoId });
      if (!result.success) {
        showToast(
          "warning",
          result.error === "already_claimed" ? t("errorAlreadyClaimed") : tCommon("errorGeneric"),
        );
        return;
      }
      showToast("success", t("claimSuccess"));
      router.refresh();
    });
  }

  function handleConfirm(reason: string) {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    startTransition(async () => {
      const result =
        action === "cancel"
          ? await cancelPedidoAction({ id: pedidoId, reason: reason.trim() || undefined })
          : await releasePedidoAction({ id: pedidoId });

      if (!result.success) {
        showToast("error", tCommon("errorGeneric"));
        return;
      }
      showToast("success", action === "cancel" ? t("cancelSuccess") : t("releaseSuccess"));
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "PENDING" && canClaim && (
        <IconButton
          icon={<CheckCircle2 className="size-5" />}
          label={t("claim")}
          onClick={handleClaim}
          disabled={isPending}
        />
      )}
      {(status === "PENDING" || status === "ATTENDED") && canManage && (
        <IconButton
          variant="danger"
          icon={<XCircle className="size-5" />}
          label={t("cancel")}
          onClick={() => setPendingAction("cancel")}
          disabled={isPending}
        />
      )}
      {status === "ATTENDED" && isAdmin && (
        <IconButton
          icon={<RotateCcw className="size-5" />}
          label={t("release")}
          onClick={() => setPendingAction("release")}
          disabled={isPending}
        />
      )}

      <PromptModal
        open={pendingAction !== null}
        title={pendingAction === "cancel" ? t("cancel") : t("release")}
        message={pendingAction === "cancel" ? t("confirmCancel") : t("confirmRelease")}
        inputLabel={pendingAction === "cancel" ? t("reasonPrompt") : undefined}
        confirmLabel={tCommon("confirm")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
