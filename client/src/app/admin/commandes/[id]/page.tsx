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
import OrderMoney from "@/features/admin/orders/OrderMoney";
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
            disabled={isLoading}
            onClick={() => changeStatus({ id: order.id, status })}
          >
            {ACTION_LABELS[status as keyof typeof ACTION_LABELS]}
          </button>
        ))}
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

      {pickup && order.status === "reserved" ? <ValidatePickup orderId={order.id} total={order.total} /> : null}

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
          <p>{pickup ? receptionLabel(order) : `${order.address}, ${order.commune}, ${order.wilaya}`}</p>
          {order.user ? <p className="text-ink-muted">Compte : {order.user.email}</p> : <p className="text-ink-muted">Commande sans compte</p>}
          {order.note ? <p className="mt-2 rounded-md bg-surface-2 p-2">Remarque : {order.note}</p> : null}
        </section>
        <section className="card space-y-1 p-5 text-sm" aria-labelledby="totals">
          <h2 id="totals" className="mb-2 text-lg">
            Montants
          </h2>
          <p>Articles : {formatPrice(order.subtotal)}</p>
          {pickup ? null : <p>Livraison : {order.shippingFee === 0 ? "offerte" : formatPrice(order.shippingFee)}</p>}
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
            <p className="font-semibold">{item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity)}</p>
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
function ValidatePickup({ orderId, total }: { orderId: number; total: number }) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [validate, { isLoading, error }] = useValidatePickupMutation();
  return (
    <section className="card space-y-3 border-blue-ink p-5" aria-labelledby="pickup-title">
      <h2 id="pickup-title" className="text-lg">
        Le client est venu ?
      </h2>
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
        <button type="button" className="btn btn-primary" disabled={isLoading} onClick={() => validate({ id: orderId, method })}>
          Valider le retrait · {formatPrice(total)}
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
