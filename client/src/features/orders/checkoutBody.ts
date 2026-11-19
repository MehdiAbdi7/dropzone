import type { CartItem } from "@/types/api";
import type { Fulfillment } from "./ordersApi";

// Ce que le formulaire de commande a rempli (adresse ET créneau : le mode choisi décide de ce
// qui part).
export type CheckoutValues = {
  fullName: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string;
  note?: string;
  acceptTerms: boolean;
  acceptLimitations: boolean;
  pickupDate: string;
  pickupTime: string;
  // « two_days » : un jour et une heure, jusqu'à la fermeture du magasin ; « unlimited » : sans date, contre une avance BaridiMob (18/11).
  reservationMode: "two_days" | "unlimited";
};

// Le corps de POST /orders (14/11) : une livraison avec son adresse, un retrait avec son jour
// et son heure. Une remarque vide n'est pas envoyée.
export function checkoutBody(
  fulfillment: Fulfillment,
  values: CheckoutValues,
  cart: { items: CartItem[]; cartHash: string },
) {
  const base = {
    items: cart.items,
    cartHash: cart.cartHash,
    fullName: values.fullName,
    phone: values.phone,
    acceptTerms: values.acceptTerms,
    acceptLimitations: values.acceptLimitations,
    ...(values.note ? { note: values.note } : {}),
  };
  return fulfillment === "delivery"
    ? { ...base, fulfillment, wilaya: values.wilaya, commune: values.commune, address: values.address }
    : values.reservationMode === "unlimited"
      ? { ...base, fulfillment, reservationMode: "unlimited" as const }
      : {
          ...base,
          fulfillment,
          reservationMode: "two_days" as const,
          pickupDate: values.pickupDate,
          pickupTime: values.pickupTime,
        };
}
