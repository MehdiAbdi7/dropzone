import { formatPrice } from "@/lib/format";
import { pickupLabel } from "@/lib/pickupLabel";
import type { OrderType } from "@/types/api";

// Les libellés de la page Commandes du back-office (14/11).

// Le numéro du jour et sa date : « n° 3 · 13/11 ». La date arrive en ISO (colonne DATE).
export function dailyLabel(dailyNumber: number, businessDate: string): string {
  const [, month, day] = businessDate.slice(0, 10).split("-");
  return `n° ${dailyNumber} · ${day}/${month}`;
}

// La commande a été saisie par un employé quand un client a appelé (19/11) : la liste sait seulement que c'est
// le cas (`takenById`), le détail donne aussi le nom. Une commande du site n'a pas de mention.
export function takenByLabel(order: { takenById?: number | null; takenByName?: string | null }): string | null {
  if (order.takenById == null) return null;
  return order.takenByName ? `Prise par téléphone par ${order.takenByName}` : "Prise par téléphone";
}

// Comment le client reçoit sa commande, en une ligne.
export function receptionLabel(order: {
  type: OrderType;
  wilaya: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  reservationMode?: "two_days" | "unlimited" | null;
  advanceAmount?: number | null;
}): string {
  if (order.type === "pickup" && order.reservationMode === "unlimited") {
    return `Réservation illimitée · avance ${formatPrice(order.advanceAmount ?? 0)}`;
  }
  if (order.type === "pickup" && order.pickupDate && order.pickupTime) {
    return `Réservation · ${pickupLabel(order.pickupDate.slice(0, 10), order.pickupTime)}`;
  }
  if (order.type === "in_store") return "Vente au magasin";
  if (order.type === "exchange") return "Échange";
  return `Livraison · ${order.wilaya ?? "?"}`;
}
