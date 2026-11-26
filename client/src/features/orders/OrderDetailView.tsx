import { CONDITION_LABELS, STATUS_LABELS, STATUS_STEPS } from "@/config/catalog";
import { warrantyLabel } from "@/config/warranty";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";
import { pickupLabel } from "@/lib/pickupLabel";
import type { OrderDetail } from "@/types/api";
import OrderSlipSection from "./OrderSlipSection";
import { pickupSteps } from "./pickupSteps";
import { slipAvailable } from "./slipRows";

// Le détail d'une commande, partagé par le suivi invité et l'espace client.
// Depuis le 14/11, une commande peut être une réservation au magasin : ses propres étapes
// (réservée, récupérée), son créneau, et un message clair si la réservation a expiré.
export default function OrderDetailView({ order }: { order: OrderDetail }) {
  const pickup = order.type === "pickup";
  // Le texte de la réservation dépend de son mode : une réservation illimitée n'a pas de jour choisi ni de délai.
  const steps = pickup ? pickupSteps(order.reservationMode) : STATUS_STEPS;
  const reached = steps.findIndex((step) => step.status === order.status);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl">Commande n° {order.number}</h2>
        <p className="text-sm text-ink-muted">Passée le {formatDate(order.createdAt)}</p>
      </header>

      {pickup && order.pickupDate && order.pickupTime ? (
        <p className="rounded-lg border border-line bg-surface-2 p-4">
          Réservation au magasin <strong>{pickupLabel(order.pickupDate, order.pickupTime)}</strong>.
        </p>
      ) : null}

      {order.type === "pickup" && order.reservationMode === "unlimited" && order.status === "reserved" ? (
        <BaridiBlock order={order} />
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

      {/* Le bon de commande (lot 6), à retélécharger quand on veut : image sur téléphone, impression ou PDF
          sur ordinateur. Pas pour une commande annulée, expirée ou retournée. */}
      {slipAvailable(order) ? <OrderSlipSection order={order} /> : null}
    </div>
  );
}

// La réservation illimitée vue par le client (18/11) : trois états. 1) le magasin n'a pas encore envoyé le
// numéro : il va appeler ; 2) le numéro est là : le client envoie l'avance ; 3) l'avance est reçue : confirmée.
function BaridiBlock({ order }: { order: OrderDetail }) {
  const advance = formatPrice(order.advanceAmount ?? 0);
  if (order.advancePaidAt) {
    return (
      <section aria-label="Réservation illimitée" className="rounded-lg border border-blue-ink bg-blue-soft p-4">
        <p className="font-display font-bold">Réservation confirmée</p>
        <p className="text-sm">
          Nous avons bien reçu votre avance de {advance}. Votre appareil est gardé pour vous : passez le chercher quand vous
          voulez, vous payerez seulement le reste ({formatPrice(order.total - (order.advanceAmount ?? 0))}).
        </p>
      </section>
    );
  }
  if (order.baridiNumber) {
    return (
      <section aria-label="Avance BaridiMob" className="space-y-2 rounded-lg border border-blue-ink bg-blue-soft p-4">
        <p className="font-display font-bold">Envoyez votre avance par BaridiMob</p>
        <p className="text-sm">
          Montant de l&apos;avance : <strong className="font-display text-lg">{advance}</strong>
        </p>
        <p className="text-sm">Numéro BaridiMob du magasin :</p>
        <p className="font-mono text-lg font-bold tracking-wide select-all">{order.baridiNumber}</p>
        <p className="text-sm text-ink-muted">
          Votre réservation est confirmée dès que le magasin reçoit l&apos;avance. Cette page se mettra à jour : rechargez-la
          pour voir l&apos;état.
        </p>
      </section>
    );
  }
  return (
    <section aria-label="Réservation illimitée" className="space-y-1 rounded-lg border border-line bg-surface-2 p-4">
      <p className="font-display font-bold">Réservation illimitée : en attente de l&apos;appel du magasin</p>
      <p className="text-sm">
        Le magasin vous appelle pour confirmer. Le numéro BaridiMob pour envoyer l&apos;avance de {advance} apparaîtra ici ensuite.
      </p>
    </section>
  );
}
