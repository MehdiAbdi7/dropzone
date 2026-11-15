import { CONDITION_LABELS } from "@/config/catalog";
import { STORE_INFO } from "@/config/storeInfo";
import { warrantyLabel } from "@/config/warranty";
import { formatDate, formatOptions, formatPrice } from "@/lib/format";
import { pickupLabel } from "@/lib/pickupLabel";
import type { OrderDetail } from "@/types/api";

// Ce que dit le bon de commande du site (lot 6), sans React ni dessin : testé à part. Le même texte sert à
// l'image que le client enregistre sur son téléphone (slipImage.ts).
export type SlipRows = {
  shop: string;
  city: string;
  title: string;
  number: string;
  date: string;
  where: string;
  items: { title: string; detail: string; price: string }[];
  // null pour un retrait : pas de livraison.
  shipping: string | null;
  total: string;
  payNote: string;
  footer: string;
};

export function slipRows(order: OrderDetail): SlipRows {
  const pickup = order.type === "pickup" && order.pickupDate && order.pickupTime;
  const place = [order.commune, order.wilaya].filter(Boolean).join(", ");
  return {
    shop: STORE_INFO.name,
    city: STORE_INFO.city,
    title: "BON DE COMMANDE",
    number: `n° ${order.number}`,
    date: formatDate(order.createdAt),
    where: pickup ? `Retrait au magasin ${pickupLabel(order.pickupDate!, order.pickupTime!)}` : `Livraison${place ? ` à ${place}` : ""}`,
    items: order.items.map((item) => ({
      title: `${item.quantity} × ${item.name}`,
      detail: [
        CONDITION_LABELS[item.condition],
        Object.keys(item.options).length ? formatOptions(item.options) : null,
        warrantyLabel(item.warrantyMonths),
      ]
        .filter(Boolean)
        .join(" · "),
      price: item.isGift ? "Offert" : formatPrice(item.unitPrice * item.quantity),
    })),
    shipping: order.type === "delivery" ? (order.shippingFee === 0 ? "Offerte" : formatPrice(order.shippingFee)) : null,
    total: formatPrice(order.total),
    payNote: pickup ? "À payer au magasin" : "À payer à la livraison",
    footer:
      "Ce bon n'est pas une facture : la facture est remise par le magasin. Pour suivre la commande, indiquez ce numéro et votre téléphone sur la page « Suivi ».",
  };
}

// Quand le bon existe (lot 6) : pour une commande du site, en livraison ou en retrait, tant qu'elle n'est pas
// annulée, expirée ou retournée. Une vente au magasin ou un échange n'est pas une commande du site : leur
// papier est la facture, donnée par le magasin.
export function slipAvailable(order: Pick<OrderDetail, "type" | "status">): boolean {
  if (order.type !== "delivery" && order.type !== "pickup") return false;
  return order.status !== "cancelled" && order.status !== "expired" && order.status !== "returned";
}
