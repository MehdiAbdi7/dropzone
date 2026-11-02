import { STATUS_LABELS, STATUS_STEPS } from "@/config/catalog";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";
import type { OrderDetail } from "@/types/api";

// Le détail d'une commande, partagé par le suivi invité et l'espace client.
export default function OrderDetailView({ order }: { order: OrderDetail }) {
  const reached = STATUS_STEPS.findIndex((step) => step.status === order.status);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Commande n° {order.number}</h2>
        <p className="text-sm text-ink-muted">Passée le {formatDate(order.createdAt)}</p>
      </header>

      {order.status === "cancelled" ? (
        <p className="rounded-lg border border-red bg-red-soft p-4 font-semibold text-red">Cette commande a été annulée.</p>
      ) : (
        // Une vraie suite d'étapes : la numérotation a un sens ici.
        <ol className="grid gap-3 sm:grid-cols-4">
          {STATUS_STEPS.map((step, index) => {
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
                {item.isGift ? "Offert" : item.condition === "refurbished" ? "Reconditionné" : "Neuf"}
                {Object.keys(item.options).length ? `, ${formatOptions(item.options)}` : ""}
              </p>
              {item.conditionReport ? <p className="mt-1">{item.conditionReport}</p> : null}
            </div>
            <p className="font-semibold">{item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity)}</p>
          </div>
        ))}
        <dl className="space-y-1 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Livraison ({order.wilaya})</dt>
            <dd>{order.shippingFee === 0 ? "Offerte" : formatPrice(order.shippingFee)}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold">Total payé à la livraison</dt>
            <dd className="font-display font-bold">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
