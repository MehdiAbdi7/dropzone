import { CONDITION_LABELS, PICKUP_STEPS, STATUS_LABELS, STATUS_STEPS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";
import { pickupLabel } from "@/lib/pickupLabel";
import type { OrderDetail } from "@/types/api";

// Le détail d'une commande, partagé par le suivi invité et l'espace client.
// Depuis le 14/11, une commande peut être un retrait au magasin : ses propres étapes
// (réservée, récupérée), son créneau, et un message clair si la réservation a expiré.
export default function OrderDetailView({ order }: { order: OrderDetail }) {
  const pickup = order.type === "pickup";
  const steps = pickup ? PICKUP_STEPS : STATUS_STEPS;
  const reached = steps.findIndex((step) => step.status === order.status);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Commande n° {order.number}</h2>
        <p className="text-sm text-ink-muted">Passée le {formatDate(order.createdAt)}</p>
      </header>

      {pickup && order.pickupDate && order.pickupTime ? (
        <p className="rounded-lg border border-line bg-surface-2 p-4">
          Retrait au magasin <strong>{pickupLabel(order.pickupDate, order.pickupTime)}</strong>.
        </p>
      ) : null}

      {order.status === "cancelled" ? (
        <p className="rounded-lg border border-red bg-red-soft p-4 font-semibold text-red">Cette commande a été annulée.</p>
      ) : order.status === "expired" ? (
        <p className="rounded-lg border border-red bg-red-soft p-4 font-semibold text-red">
          Réservation expirée : l&apos;appareil a été remis en vente.
        </p>
      ) : (
        // Une vraie suite d'étapes : la numérotation a un sens ici.
        <ol className={`grid gap-3 ${pickup ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}>
          {steps.map((step, index) => {
            const done = index <= reached;
            return (
              <li
                key={step.status}
                aria-current={index === reached ? "step" : undefined}
                className={`rounded-lg border p-3 text-sm ${done ? "border-blue-ink bg-blue-soft" : "border-line text-ink-muted"}`}
              >
                <p className="font-display font-bold">
                  {index + 1}. {STATUS_LABELS[step.status]}
                </p>
                <p className="mt-1">{step.text}</p>
              </li>
            );
          })}
        </ol>
      )}

      <section aria-label="Articles" className="card divide-y divide-line">
        {order.items.map((item) => (
          <div key={item.sku} className="flex flex-wrap justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-semibold">
                {item.quantity} × {item.name}
              </p>
              <p className="text-ink-muted">
                {item.isGift ? "Offert" : CONDITION_LABELS[item.condition]}
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
        <dl className="space-y-1 p-4 text-sm">
          {pickup ? null : (
            <div className="flex justify-between">
              <dt className="text-ink-muted">Livraison ({order.wilaya})</dt>
              <dd>{order.shippingFee === 0 ? "Offerte" : formatPrice(order.shippingFee)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base">
            <dt className="font-semibold">
              {pickup ? (order.status === "picked_up" ? "Total payé au magasin" : "Total à payer au magasin") : "Total payé à la livraison"}
            </dt>
            <dd className="font-display font-bold">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
