"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { STATUS_LABELS } from "@/config/catalog";
import { useAdminOrderQuery, useChangeStatusMutation } from "@/features/admin/adminApi";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";

// Les boutons ne proposent que les transitions autorisées, renvoyées par l'API.
const ACTION_LABELS = {
  confirmed: "Confirmer (client appelé)",
  shipped: "Marquer expédiée",
  delivered: "Marquer livrée",
} as const;

export default function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isError } = useAdminOrderQuery(Number(id));
  const [changeStatus, { isLoading, error }] = useChangeStatusMutation();

  if (isError) {
    return <p role="alert">Cette commande est introuvable.</p>;
  }
  if (!order) {
    return <p className="text-ink-muted">Chargement…</p>;
  }

  const forward = order.allowedTransitions.filter((status) => status !== "cancelled");
  const canCancel = order.allowedTransitions.includes("cancelled");

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/commandes" className="text-sm text-blue-ink underline">
        Commandes
      </Link>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl">Commande n° {order.number}</h1>
        <p className="text-ink-muted">{formatDate(order.createdAt)}</p>
      </header>

      <section className="card flex flex-wrap items-center gap-3 p-5" aria-label="Statut">
        <p className="mr-auto">
          Statut : <strong>{STATUS_LABELS[order.status]}</strong>
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
            trigger="Annuler la commande"
            title={`Annuler la commande n° ${order.number} ?`}
            confirmLabel="Annuler la commande"
            onConfirm={() => changeStatus({ id: order.id, status: "cancelled" })}
          >
            Le stock de chaque article, cadeaux compris, est rendu. Une commande annulée ne peut plus changer.
          </ConfirmDialog>
        ) : null}
        {error ? <p className="field-error w-full">{errorMessage(error)}</p> : null}
      </section>

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
          <p>
            {order.address}, {order.commune}, {order.wilaya}
          </p>
          {order.user ? <p className="text-ink-muted">Compte : {order.user.email}</p> : <p className="text-ink-muted">Commande sans compte</p>}
          {order.note ? <p className="mt-2 rounded-md bg-surface-2 p-2">Remarque : {order.note}</p> : null}
        </section>
        <section className="card space-y-1 p-5 text-sm" aria-labelledby="totals">
          <h2 id="totals" className="mb-2 text-lg">
            Montants
          </h2>
          <p>Articles : {formatPrice(order.subtotal)}</p>
          <p>Livraison : {order.shippingFee === 0 ? "offerte" : formatPrice(order.shippingFee)}</p>
          <p className="font-display text-xl font-bold">À encaisser : {formatPrice(order.total)}</p>
          {order.limitationsAccepted ? (
            <p className="mt-2 font-semibold text-red">Le client a accepté les limitations des reconditionnés.</p>
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
                {item.isGift ? "Article offert" : item.condition === "refurbished" ? "Reconditionné" : "Neuf"}
                {Object.keys(item.options).length ? `, ${formatOptions(item.options)}` : ""}
              </p>
              {item.conditionReport ? <p className="mt-1">{item.conditionReport}</p> : null}
            </div>
            <p className="font-semibold">{item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
