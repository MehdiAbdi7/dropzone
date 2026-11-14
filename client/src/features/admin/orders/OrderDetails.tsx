"use client";

import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { STATUS_LABELS } from "@/config/catalog";
import { useDeleteOrderMutation, type AdminOrder } from "@/features/admin/api/ordersApi";
import { errorMessage } from "@/lib/errors";
import { formatPrice } from "@/lib/format";
import OrderEvents from "./OrderEvents";
import { AmountsCard, ArticlesCard, ClientCard } from "./OrderInfo";
import OrderMoney from "./OrderMoney";

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
        {!closed ? (
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
          La commande disparaît, une trace reste dans l&apos;historique.
        </ConfirmDialog>
      </div>
      {deleteState.error ? (
        <p role="alert" className="field-error">
          {errorMessage(deleteState.error)}
          {errorMessage(deleteState.error).includes("journée de caisse") ? (
            <>
              {" "}
              <Link href="/admin/caisse" className="underline">
                Ouvrir la caisse
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <ClientCard order={order} />
        <AmountsCard order={order} />
      </div>
      <ArticlesCard order={order} />
      <OrderMoney order={order} />
      <OrderEvents events={order.events} />
    </div>
  );
}
