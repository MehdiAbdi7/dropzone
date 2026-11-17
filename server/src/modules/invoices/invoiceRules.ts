import type { OrderStatus, OrderType } from "../../generated/prisma/client.js";

// Quand une facture peut être imprimée (lot 6, précisions de Mehdi du 15/11). Renvoie `null` si elle le peut,
// sinon la raison, en français, que la page affiche :
//  - une livraison à partir de « En préparation » (confirmée par téléphone) ;
//  - un retrait seulement une fois récupéré (le client est venu : moyen de paiement et prix final connus) ;
//  - une vente au magasin et un échange tout de suite, ils sont confirmés à leur création ;
//  - jamais une commande annulée, expirée ou retournée.
const DELIVERY_OK: OrderStatus[] = ["confirmed", "shipped", "delivered", "collected"];

export function invoiceBlocker(order: { type: OrderType; status: OrderStatus }): string | null {
  if (order.status === "cancelled" || order.status === "expired" || order.status === "returned") {
    return "Une commande annulée, expirée ou retournée n'a pas de facture";
  }
  if (order.type === "delivery") {
    return DELIVERY_OK.includes(order.status)
      ? null
      : "La facture d'une livraison est disponible une fois la commande confirmée (étape « En préparation »)";
  }
  if (order.type === "pickup") {
    return order.status === "picked_up" ? null : "La facture d'une réservation est disponible une fois le téléphone récupéré";
  }
  return order.status === "picked_up" ? null : "Cette vente n'est pas terminée : pas de facture";
}
