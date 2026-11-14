import type { OrderStatus } from "../../generated/prisma/client.js";

// Le nom de chaque état de commande, dans les messages d'erreur du back-office.
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "en attente",
  confirmed: "confirmée",
  shipped: "expédiée",
  delivered: "livrée",
  cancelled: "annulée",
  reserved: "réservée",
  picked_up: "récupérée",
  expired: "expirée",
};
