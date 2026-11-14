import { CONDITION_LABELS, STATUS_LABELS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import type { AdminOrder } from "@/features/admin/api/ordersApi";
import { reductionText } from "@/features/admin/sales/ticket";
import { formatOptions, formatPrice } from "@/lib/format";
import { receptionLabel } from "./orderLabels";

// Les infos d'une commande, en trois blocs : le client, les montants, les articles. Ils servent à deux
// endroits : l'onglet Détails, et l'étape « À confirmer », où l'admin appelle le client et doit avoir
// tout sous les yeux (nom, téléphone, adresse, ce qui est commandé, le total).

export function ClientCard({ order }: { order: AdminOrder }) {
  const delivery = order.type === "delivery";
  return (
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
  );
}

export function AmountsCard({ order }: { order: AdminOrder }) {
  const delivery = order.type === "delivery";
  return (
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
  );
}

export function ArticlesCard({ order }: { order: AdminOrder }) {
  return (
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
  );
}

// L'étape « À confirmer » d'une livraison (le client attend un appel) ou « Réservée » d'un retrait (le
// client vient chercher sa commande). Tout ce qu'il faut sous les yeux, en haut de la fenêtre, avant
// les boutons : le nom et le numéro (un appui sur le numéro lance l'appel sur téléphone), l'adresse
// ou le créneau de retrait, ce qui est commandé et ce qu'il paiera.
export function CallSheet({ order }: { order: AdminOrder }) {
  const delivery = order.type === "delivery";
  return (
    <div className="space-y-4">
      <section className="card space-y-1 border-2 border-blue p-3 text-sm" aria-label={delivery ? "Client à appeler" : "Client attendu"}>
        <p className="text-xs font-semibold text-ink-muted">{delivery ? "Client à appeler" : "Client attendu au magasin"}</p>
        <p className="font-display text-base font-bold">{order.fullName}</p>
        <a href={`tel:${order.phone}`} className="inline-block font-display text-base font-bold tabular-nums text-blue-ink underline">
          {order.phone}
        </a>
        <p>{delivery ? `${order.address}, ${order.commune}, ${order.wilaya}` : receptionLabel(order)}</p>
        {order.note ? <p className="rounded-md bg-surface-2 p-2">Remarque du client : {order.note}</p> : null}
        {order.limitationsAccepted ? <p className="font-semibold text-red">Le client a accepté les limitations des affaires.</p> : null}
      </section>
      <ArticlesCard order={order} />
      <p className="flex flex-wrap items-baseline justify-between gap-2 px-1 text-sm">
        <span className="text-ink-muted">
          {delivery ? `Livraison ${order.shippingFee === 0 ? "offerte" : formatPrice(order.shippingFee)} · ` : ""}
          {STATUS_LABELS[order.status]}
        </span>
        <span className="font-display text-base font-bold">À encaisser : {formatPrice(order.total)}</span>
      </p>
    </div>
  );
}
