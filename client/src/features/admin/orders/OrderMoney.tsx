import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import type { AdminOrder } from "@/features/admin/api/ordersApi";
import { formatDate, formatPrice } from "@/lib/format";

const KIND_LABELS: Record<string, string> = {
  sale: "Vente au magasin",
  pickup: "Retrait payé",
  delivery: "Livraison encaissée",
  exchange: "Échange",
  correction: "Correction",
};

// L'argent d'une commande : ce qui est payé (net des corrections), chaque mouvement du journal,
// et le bénéfice. « Bénéfice inconnu » quand un prix d'achat manque : jamais un faux chiffre.
export default function OrderMoney({ order }: { order: AdminOrder }) {
  return (
    <section className="card space-y-3 p-5 text-sm" aria-labelledby="money-title">
      <h2 id="money-title" className="text-lg">
        Argent
      </h2>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Payé</dt>
          <dd className="font-semibold tabular-nums">{formatPrice(order.paid)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Bénéfice</dt>
          <dd className="font-semibold tabular-nums">
            {order.profit === null ? "inconnu (prix d'achat manquant)" : formatPrice(order.profit)}
          </dd>
        </div>
      </dl>
      {order.payments.length > 0 ? (
        <ul className="divide-y divide-line border-t border-line">
          {order.payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                {KIND_LABELS[payment.kind] ?? payment.kind} · {PAYMENT_METHOD_LABELS[payment.method]}
                <span className="block text-xs text-ink-muted">{formatDate(payment.createdAt)}</span>
              </span>
              <span className={`font-semibold tabular-nums ${payment.amount < 0 ? "text-red" : ""}`}>
                {payment.amount > 0 ? "+" : ""}
                {formatPrice(payment.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted">Rien n&apos;a été encaissé pour cette commande.</p>
      )}
    </section>
  );
}
