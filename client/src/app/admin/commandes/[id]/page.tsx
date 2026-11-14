"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CONDITION_LABELS, ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, STATUS_LABELS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import {
  useAdminOrderQuery,
  useChangeStatusMutation,
  useDeleteOrderMutation,
  useValidatePickupMutation,
} from "@/features/admin/api/ordersApi";
import EditOrderDialog from "@/features/admin/orders/EditOrderDialog";
import OrderEvents from "@/features/admin/orders/OrderEvents";
import NegotiatePrices from "@/features/admin/orders/NegotiatePrices";
import OrderMoney from "@/features/admin/orders/OrderMoney";
import { negotiationState, type NegotiableItem } from "@/features/admin/orders/negotiation";
import { reductionText } from "@/features/admin/sales/ticket";
import { dailyLabel, receptionLabel } from "@/features/admin/orders/orderLabels";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/types/api";

// Les boutons ne proposent que les transitions autorisées, renvoyées par l'API.
const ACTION_LABELS = {
  confirmed: "Confirmer (client appelé)",
  shipped: "Marquer expédiée",
  delivered: "Marquer livrée",
} as const;

const METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export default function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isError } = useAdminOrderQuery(Number(id));
  const [changeStatus, { isLoading, error }] = useChangeStatusMutation();
  const [deleteOrder, deleteState] = useDeleteOrderMutation();
  const [editing, setEditing] = useState(false);
  // Après la suppression, la lecture de la commande se relance et répond 404 : sans ce drapeau,
  // « Cette commande est introuvable » s'afficherait un instant avant la redirection.
  const [removed, setRemoved] = useState(false);
  // Les prix négociés saisis par ligne (lot 3) : envoyés avec « Confirmer » ou « Valider le retrait ».
  const [prices, setPrices] = useState<Record<number, number>>({});
  const router = useRouter();

  async function remove(orderId: number) {
    try {
      await deleteOrder(orderId).unwrap();
      setRemoved(true);
      router.push("/admin/commandes");
    } catch {
      // L'erreur RTK Query est affichée sous les boutons de la commande.
    }
  }

  if (removed) {
    return <p role="status">Commande supprimée, retour à la liste…</p>;
  }
  if (isError) {
    return <p role="alert">Cette commande est introuvable.</p>;
  }
  if (!order) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  const forward = order.allowedTransitions.filter((status) => status !== "cancelled");
  const canCancel = order.allowedTransitions.includes("cancelled");
  const pickup = order.type === "pickup";
  const delivery = order.type === "delivery";
  // On ne négocie que le prix d'une commande dont l'argent n'est pas encore entré (lot 3) ; une
  // commande payée se corrige par « Modifier ».
  const canNegotiate =
    ["pending", "confirmed", "reserved"].includes(order.status) &&
    !order.payments.some((payment) => payment.kind !== "correction");
  const negotiation = negotiationState(order.items, canNegotiate ? prices : {}, order.shippingFee);
  const setPrice = (itemId: number, value: number) => setPrices((current) => ({ ...current, [itemId]: value }));

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/commandes" className="text-sm text-blue-ink underline">
        Commandes
      </Link>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl">Commande {dailyLabel(order.dailyNumber, order.businessDate)}</h1>
        <p className="text-ink-muted">
          N° de suivi {order.number} · {formatDate(order.createdAt)}
        </p>
      </header>

      <section className="card flex flex-wrap items-center gap-3 p-5" aria-label="Statut">
        <p className="mr-auto">
          {ORDER_TYPE_LABELS[order.type]} · Statut : <strong>{STATUS_LABELS[order.status]}</strong>
        </p>
        {forward.map((status) => (
          <button
            key={status}
            type="button"
            className="btn btn-primary"
            disabled={isLoading || (status === "confirmed" && negotiation.problem !== null)}
            onClick={() =>
              // La confirmation d'une livraison est le moment de négocier le prix (lot 3).
              changeStatus({ id: order.id, status, ...(status === "confirmed" ? { prices: negotiation.toSend } : {}) })
            }
          >
            {ACTION_LABELS[status as keyof typeof ACTION_LABELS]}
          </button>
        ))}
        {canNegotiate && !pickup && forward.includes("confirmed") ? (
          <NegotiatePrices items={order.items} prices={prices} onPrice={setPrice} shippingFee={order.shippingFee} />
        ) : null}
        {canCancel ? (
          <ConfirmDialog
            trigger={pickup ? "Annuler la réservation" : "Annuler la commande"}
            title={`Annuler la commande n° ${order.number} ?`}
            confirmLabel="Annuler la commande"
            onConfirm={() => changeStatus({ id: order.id, status: "cancelled" })}
          >
            Le stock de chaque article, cadeaux compris, est rendu. Une commande annulée ne peut plus changer.
          </ConfirmDialog>
        ) : null}
        {/* Modifier et supprimer : après coup, avec stock, argent et trace qui suivent (lot 2). */}
        {order.status !== "cancelled" && order.status !== "expired" ? (
          <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
            Modifier
          </button>
        ) : null}
        <ConfirmDialog
          trigger="Supprimer"
          title={`Supprimer la commande suivi ${order.number} ?`}
          confirmLabel="Supprimer la commande"
          onConfirm={() => remove(order.id)}
        >
          Le stock de chaque article, cadeaux compris, est rendu
          {order.status === "cancelled" || order.status === "expired" ? " (déjà fait : la commande est " + STATUS_LABELS[order.status] + ")" : ""}.
          {order.paid !== 0
            ? ` Les ${formatPrice(order.paid)} encaissés sont rendus dans la caisse d'aujourd'hui, qui doit être ouverte.`
            : " Rien n'a été encaissé."}{" "}
          La commande disparaît, une trace reste dans l&apos;historique.
        </ConfirmDialog>
        {error ? <p className="field-error w-full">{errorMessage(error)}</p> : null}
        {deleteState.error ? (
          <p role="alert" className="field-error w-full">
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
      </section>

      <EditOrderDialog order={order} open={editing} onClose={() => setEditing(false)} />

      {pickup && order.status === "reserved" ? (
        <ValidatePickup
          orderId={order.id}
          negotiation={negotiation}
          items={order.items}
          prices={prices}
          onPrice={setPrice}
          shippingFee={order.shippingFee}
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card space-y-1 p-5 text-sm" aria-labelledby="client">
          <h2 id="client" className="mb-2 text-lg">
            Client
          </h2>
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
        <section className="card space-y-1 p-5 text-sm" aria-labelledby="totals">
          <h2 id="totals" className="mb-2 text-lg">
            Montants
          </h2>
          <p>Articles : {formatPrice(order.subtotal)}</p>
          {delivery ? <p>Livraison : {order.shippingFee === 0 ? "offerte" : formatPrice(order.shippingFee)}</p> : null}
          <p className="font-display text-xl font-bold">
            {order.status === "picked_up" ? "Encaissé" : "À encaisser"} : {formatPrice(order.total)}
          </p>
          {order.limitationsAccepted ? (
            <p className="mt-2 font-semibold text-red">Le client a accepté les limitations des affaires.</p>
          ) : null}
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
              {warrantyLabel(item.warrantyMonths) ? (
                <p className="mt-1 font-semibold">{warrantyLabel(item.warrantyMonths)}</p>
              ) : null}
            </div>
            <p className="text-right font-semibold">
              {item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity)}
              {/* La réduction accordée (lot 3) : prix catalogue → prix accordé, et par qui. */}
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

// Le client est venu : il paie, et le paiement entre dans la caisse du jour (14/11).
// Espèces par défaut : c'est le cas le plus courant au comptoir.
// Avant d'encaisser, le prix de chaque article peut se négocier (lot 3) : le nouveau total est
// celui qui entre dans la caisse.
function ValidatePickup({
  orderId,
  negotiation,
  items,
  prices,
  onPrice,
  shippingFee,
}: {
  orderId: number;
  negotiation: ReturnType<typeof negotiationState>;
  items: NegotiableItem[];
  prices: Record<number, number>;
  onPrice: (id: number, value: number) => void;
  shippingFee: number;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [validate, { isLoading, error }] = useValidatePickupMutation();
  return (
    <section className="card space-y-3 border-blue-ink p-5" aria-labelledby="pickup-title">
      <h2 id="pickup-title" className="text-lg">
        Le client est venu ?
      </h2>
      <NegotiatePrices items={items} prices={prices} onPrice={onPrice} shippingFee={shippingFee} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm font-semibold">
          <span className="block">Moyen de paiement</span>
          <select className="input" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {PAYMENT_METHOD_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isLoading || negotiation.problem !== null}
          onClick={() => validate({ id: orderId, method, prices: negotiation.toSend })}
        >
          Valider le retrait · {Number.isNaN(negotiation.total) ? "—" : formatPrice(negotiation.total)}
        </button>
      </div>
      {error ? (
        <p role="alert" className="field-error">
          {errorMessage(error)}
          {errorMessage(error).includes("journée de caisse") ? (
            <>
              {" "}
              <Link href="/admin/caisse" className="underline">
                Ouvrir la caisse
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
