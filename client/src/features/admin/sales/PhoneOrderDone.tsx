import Link from "next/link";
import { canAccess } from "@/features/admin/access";
import type { PhoneOrderDone as Done } from "@/features/admin/api/phoneOrderApi";
import { useAdminRole } from "@/features/admin/AdminRoleContext";
import { algiersDate, describePickupDay } from "@/lib/algiersTime";
import { formatPrice } from "@/lib/format";

// La commande prise par téléphone est créée (19/11) : le numéro de suivi à donner au client, ce qui l'attend, et la
// suite (voir la commande, nouvelle commande).
export default function PhoneOrderDone({ order, onNew }: { order: Done; onNew: () => void }) {
  const role = useAdminRole();
  const isReservation = order.type === "pickup";
  return (
    <section role="status" className="card space-y-4 border-blue-ink p-6" aria-labelledby="phone-done-title">
      <h2 id="phone-done-title" className="text-2xl">
        {isReservation ? "Réservation" : "Livraison"} n° {order.dailyNumber} créée
      </h2>
      <p className="text-lg">
        Total : <strong className="font-display tabular-nums">{formatPrice(order.total)}</strong>
        {isReservation ? ", payé au magasin." : ", payé à la réception."}
      </p>
      {order.reservationMode === "two_days" && order.pickupDate && order.pickupTime ? (
        <p>
          Le client passe le {describePickupDay(order.pickupDate, algiersDate(new Date())).weekday.toLowerCase()}{" "}
          {describePickupDay(order.pickupDate, algiersDate(new Date())).date} à {order.pickupTime.replace(":", "h")}.
        </p>
      ) : null}
      {order.reservationMode === "unlimited" ? (
        <p>
          Réservation illimitée : l&apos;appareil est gardé sans date limite contre une avance BaridiMob de{" "}
          <strong>{formatPrice(order.advanceAmount ?? 0)}</strong>.
        </p>
      ) : null}
      {/* Le client suit sa commande avec ce numéro et son téléphone, sur la page Suivi du site. */}
      <p className="rounded-md bg-surface-2 p-3">
        À donner au client : numéro de suivi <strong className="font-display tabular-nums">{order.number}</strong>. Il le saisit avec
        son téléphone sur la page Suivi du site.
      </p>
      <p className="text-sm text-ink-muted">
        {isReservation ? "La commande est « Réservée »." : "La commande est « À confirmer » : elle apparaît dans Commandes."}
      </p>
      {/* Ce que le calcul du ticket a signalé : un cadeau épuisé n'a PAS été offert. */}
      {order.notices.length > 0 ? (
        <ul role="alert" className="list-disc space-y-1 pl-5 font-semibold text-red">
          {order.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={onNew}>
          Nouvelle commande
        </button>
        {/* La page Commandes n'est pas pour le vendeur (lot 7). */}
        {canAccess(role, "/admin/commandes") ? (
          <Link href={`/admin/commandes/${order.id}`} className="btn btn-secondary">
            Voir la commande
          </Link>
        ) : null}
      </div>
    </section>
  );
}
