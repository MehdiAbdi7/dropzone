import { pickupLabel } from "@/lib/pickupLabel";
import type { OrderType } from "@/types/api";

// Les libellés de la page Commandes du back-office (14/11).

// Le numéro du jour et sa date : « n° 3 · 13/11 ». La date arrive en ISO (colonne DATE).
export function dailyLabel(dailyNumber: number, businessDate: string): string {
  const [, month, day] = businessDate.slice(0, 10).split("-");
  return `n° ${dailyNumber} · ${day}/${month}`;
}

// Comment le client reçoit sa commande, en une ligne.
export function receptionLabel(order: {
  type: OrderType;
  wilaya: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
}): string {
  if (order.type === "pickup" && order.pickupDate && order.pickupTime) {
    return `Retrait · ${pickupLabel(order.pickupDate.slice(0, 10), order.pickupTime)}`;
  }
  if (order.type === "in_store") return "Vente au magasin";
  return `Livraison · ${order.wilaya ?? "?"}`;
}
