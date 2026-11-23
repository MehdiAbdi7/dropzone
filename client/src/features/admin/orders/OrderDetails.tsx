"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { STATUS_LABELS } from "@/config/catalog";
import { useDeleteOrderMutation, type AdminOrder } from "@/features/admin/api/ordersApi";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import OrderEvents from "./OrderEvents";
import { AmountsCard, ArticlesCard, ClientCard } from "./OrderInfo";
import OrderMoney from "./OrderMoney";
import OrderTradeIn from "./OrderTradeIn";
import { OpenCashButton } from "@/features/admin/cash/CashDialogContext";

// L'onglet « Détails » de la fenêtre d'une commande : le client, les montants, les articles, l'argent,
// les traces, et les deux actions qui valent à n'importe quelle étape : modifier (après coup, avec
// stock, argent et trace qui suivent) et supprimer.
export default function OrderDetails({ order, onEdit, onDeleted }: { order: AdminOrder; onEdit: () => void; onDeleted: () => void }) {
  const [deleteOrder, deleteState] = useDeleteOrderMutation();
  const closed = order.status === "cancelled" || order.status === "expired" || order.status === "returned";

  async function remove() {
    try {
      await deleteOrder(order.id).unwrap();
      onDeleted();
    } catch {
      // L'erreur RTK Query est affichée sous les boutons.
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Un échange ne se modifie pas : il lie un téléphone donné, un téléphone repris et une différence
            d'argent. On le supprime et on le refait. */}
        {!closed && order.type !== "exchange" ? (
          <button type="button" className="btn btn-secondary" onClick={onEdit}>
            Modifier
          </button>
        ) : null}
        <ConfirmDialog
          trigger="Supprimer"
          title={`Supprimer la commande suivi ${order.number} ?`}
          confirmLabel="Supprimer la commande"
          onConfirm={remove}
        >
          Le stock de chaque article, cadeaux compris, est rendu
          {order.status === "cancelled" || order.status === "expired" ? " (déjà fait : la commande est " + STATUS_LABELS[order.status] + ")" : ""}.
          {order.paid !== 0
            ? ` Les ${formatPrice(order.paid)} encaissés sont rendus dans la caisse d'aujourd'hui, qui doit être ouverte.`
            : " Rien n'a été encaissé."}{" "}
          {order.tradeIn ? " Le téléphone repris est retiré de la liste des reprises (impossible s'il est déjà en vente)." : ""}{" "}
          La commande disparaît, une trace reste dans l&apos;historique.
        </ConfirmDialog>
      </div>
      {deleteState.error ? (
        <p role="alert" className="field-error">
          {errorMessage(deleteState.error)}
          {errorMessage(deleteState.error).includes("journée de caisse") ? (
            <>
              {" "}
              <OpenCashButton className="underline">Ouvrir la caisse</OpenCashButton>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ClientCard order={order} />
        <AmountsCard order={order} />
      </div>
      <ArticlesCard order={order} />
      {order.tradeIn ? <OrderTradeIn tradeIn={order.tradeIn} /> : null}
      <OrderMoney order={order} />
      <OrderEvents events={order.events} />
    </div>
  );
}
