import type { OrderStatus, OrderType } from "@/types/api";

// Quand la facture d'une commande peut être ouverte (lot 6, précisions de Mehdi du 15/11) : une livraison à
// partir de « En préparation » (confirmée), un retrait une fois récupéré, une vente au magasin et un échange
// tout de suite, jamais une commande annulée, expirée ou retournée. Même règle que l'API (`invoiceBlocker`).
const DELIVERY_OK: OrderStatus[] = ["confirmed", "shipped", "delivered", "collected"];

export function invoiceAvailable(order: { type: OrderType; status: OrderStatus }): boolean {
  if (order.status === "cancelled" || order.status === "expired" || order.status === "returned") return false;
  if (order.type === "delivery") return DELIVERY_OK.includes(order.status);
  return order.status === "picked_up";
}
