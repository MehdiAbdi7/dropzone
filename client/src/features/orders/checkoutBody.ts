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
    : { ...base, fulfillment, pickupDate: values.pickupDate, pickupTime: values.pickupTime };
}
