import { formatPrice } from "./format";

// Le créneau d'un retrait en français (14/11) : « dimanche 15 novembre à 15h30 ».
// Le jour arrive en texte (« 2026-11-15 ») ; il est lu et écrit en UTC pour qu'aucun fuseau de
// navigateur ne le fasse glisser à la veille.
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function pickupLabel(pickupDate: string, pickupTime: string): string {
  return `${DAY.format(new Date(`${pickupDate}T00:00:00Z`))} à ${pickupTime.replace(":", "h")}`;
}

// « Où et quand » d'une commande en réservation (18/11) : le créneau d'une réservation de deux jours, ou la mention
// de l'avance d'une réservation illimitée (pas de date). null pour une livraison, une vente au magasin ou un
// retrait dont on ne sait rien. Une commande d'avant le 18/11 n'a pas de mode : son créneau suffit.
export function reservationWhere(order: {
  type: string;
  pickupDate: string | null;
  pickupTime: string | null;
  reservationMode?: "two_days" | "unlimited" | null;
  advanceAmount?: number | null;
}): string | null {
  if (order.type !== "pickup") return null;
  if (order.reservationMode === "unlimited") {
    return `Réservation illimitée au magasin (avance de ${formatPrice(order.advanceAmount ?? 0)})`;
  }
  return order.pickupDate && order.pickupTime ? `Réservation au magasin ${pickupLabel(order.pickupDate, order.pickupTime)}` : null;
}
