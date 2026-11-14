"use client";

import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CONDITION_LABELS, STATUS_LABELS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import { useDeleteOrderMutation, type AdminOrder } from "@/features/admin/api/ordersApi";
import { reductionText } from "@/features/admin/sales/ticket";
import { errorMessage } from "@/lib/errors";
import { formatOptions, formatPrice } from "@/lib/format";
import OrderEvents from "./OrderEvents";
import OrderMoney from "./OrderMoney";
import { receptionLabel } from "./orderLabels";

// L'onglet « Détails » de la fenêtre d'une commande : le client, les montants, les articles, l'argent,
// les traces, et les deux actions qui valent à n'importe quelle étape : modifier (après coup, avec
// stock, argent et trace qui suivent) et supprimer.
export default function OrderDetails({ order, onEdit, onDeleted }: { order: AdminOrder; onEdit: () => void; onDeleted: () => void }) {
  const [deleteOrder, deleteState] = useDeleteOrderMutation();
  const delivery = order.type === "delivery";
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
        <section className="card space-y-1 p-4 text-sm" aria-labelledby="client">
          <h3 id="client" className="mb-2 text-base font-semibold">
            Client
          </h3>
          <p className="font-semibold">{order.fullName}</p>
          <p>
            <a href={`tel:${order.phone}`} className="text-blue-ink underline">
              {order.phone}
            </a>
          </p>
          {/* Seule une livraison a une adresse : un retrait et une vente au magasin n'en ont pas. */}
          <p>{delivery ? `${order.address}, ${order.commune}, ${order.wilaya}` : receptionLabel(order)}</p>
          {order.user ? <p className="text-ink-muted">Compte : {order.user.email}</p> : <p className="text-ink-muted">Commande sans compte</p>}
          {order.note ? <p className="mt-2 rounded-md bg-surface-2 p-2">Remarque : {order.note}</p> : null}
        </section>
        <section className="card space-y-1 p-4 text-sm" aria-labelledby="totals">
          <h3 id="totals" className="mb-2 text-base font-semibold">
            Montants
          </h3>
          <p>Articles : {formatPrice(order.subtotal)}</p>
          {delivery ? <p>Livraison : {order.shippingFee === 0 ? "offerte" : formatPrice(order.shippingFee)}</p> : null}
          <p className="font-display text-lg font-bold">
            {order.status === "picked_up" || order.status === "collected"
              ? "Encaissé"
              : order.status === "returned"
                ? "Non encaissé (colis retourné)"
                : "À encaisser"}{" "}
            : {formatPrice(order.total)}
          </p>
          {order.limitationsAccepted ? <p className="mt-2 font-semibold text-red">Le client a accepté les limitations des affaires.</p> : null}
        </section>
      </div>

      <section className="card divide-y divide-line" aria-label="Articles">
        {order.items.map((item) => (
          <div key={item.id} className="flex flex-wrap justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-semibold">
                {item.quantity} × {item.name} <span className="font-normal text-ink-muted">({item.sku})</span>
              </p>
              <p className="text-ink-muted">
                {item.isGift ? "Article offert" : CONDITION_LABELS[item.condition]}
                {Object.keys(item.options).length ? `, ${formatOptions(item.options)}` : ""}
              </p>
              {item.conditionReport ? <p className="mt-1">{item.conditionReport}</p> : null}
              {warrantyLabel(item.warrantyMonths) ? <p className="mt-1 font-semibold">{warrantyLabel(item.warrantyMonths)}</p> : null}
            </div>
            <p className="text-right font-semibold">
              {item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity)}
              {/* La réduction accordée : prix catalogue → prix accordé, et par qui. */}
              {!item.isGift && item.listPrice !== null && item.listPrice !== item.unitPrice ? (
                <span className="block text-xs font-normal text-ink-muted">
                  {reductionText({ listPrice: item.listPrice, unitPrice: item.unitPrice })}
                  {item.grantedByName ? ` · accordée par ${item.grantedByName}` : ""}
                </span>
              ) : null}
            </p>
          </div>
        ))}
      </section>

      <OrderMoney order={order} />
      <OrderEvents events={order.events} />
    </div>
  );
}
