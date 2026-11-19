import { FREE_SHIPPING_FROM, SHIPPING_FEE } from "@/config/shipping";
import { formatPrice } from "@/lib/format";
import { ticketLinesBody, type SaleForm, type TicketLine } from "./ticket";

// La commande prise par téléphone (19/11) : le vendeur saisit une livraison ou une réservation pour un client qui
// appelle. Fonctions pures : ce que la page refuse tout de suite, et ce qui part vers l'API.

export const MAX_SHIPPING_FEE = 100_000;

// Ce que les fenêtres « Livraison » et « Réservation » remplissent. `shippingFee` : NaN tant que le champ est
// vide, c'est le serveur qui calcule alors les frais comme pour le site.
export type PhoneOrderDraft = {
  fulfillment: "delivery" | "pickup";
  wilaya: string;
  commune: string;
  address: string;
  shippingFee: number;
  reservationMode: "two_days" | "unlimited";
  pickupDate: string;
  pickupTime: string;
};

export const emptyPhoneDraft = (fulfillment: PhoneOrderDraft["fulfillment"]): PhoneOrderDraft => ({
  fulfillment,
  wilaya: "",
  commune: "",
  address: "",
  shippingFee: Number.NaN,
  reservationMode: "two_days",
  pickupDate: "",
  pickupTime: "",
});

// Ce que l'API refuserait de toute façon, dit tout de suite en français (null : rien à redire).
export function phoneOrderProblem(draft: PhoneOrderDraft): string | null {
  if (draft.fulfillment === "delivery") {
    if (draft.wilaya.trim() === "") return "Choisissez la wilaya de livraison.";
    if (draft.commune.trim().length < 2) return "La commune de livraison (2 caractères au minimum).";
    if (draft.address.trim().length < 5) return "L'adresse de livraison (5 caractères au minimum).";
    const fee = draft.shippingFee;
    if (!Number.isNaN(fee) && (!Number.isInteger(fee) || fee < 0 || fee > MAX_SHIPPING_FEE)) {
      return "Les frais de livraison : un nombre entier de dinars, de 0 à 100 000.";
    }
    return null;
  }
  if (draft.reservationMode === "two_days") {
    if (draft.pickupDate === "") return "Choisissez le jour de la réservation.";
    if (draft.pickupTime === "") return "Choisissez l'heure de la réservation.";
  }
  return null;
}

// Les frais de livraison que la commande aura : aucun pour une réservation, ceux que le vendeur a saisis (même 0),
// sinon la règle du site. La base est le sous-total APRÈS les prix accordés, comme le serveur (une remise peut
// faire passer sous le seuil de livraison offerte). NaN tant qu'un prix du ticket manque.
export function phoneOrderShipping(subtotal: number, draft: PhoneOrderDraft): number {
  if (draft.fulfillment === "pickup") return 0;
  if (!Number.isNaN(draft.shippingFee)) return draft.shippingFee;
  if (Number.isNaN(subtotal)) return Number.NaN;
  return subtotal === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}

// Le total que le vendeur lit au client avant de créer la commande.
export const phoneOrderTotal = (subtotal: number, draft: PhoneOrderDraft): number =>
  subtotal + phoneOrderShipping(subtotal, draft);

// Ce que le vendeur doit savoir d'une réservation illimitée : le numéro BaridiMob et l'avance se gèrent depuis la
// page Commandes, qu'un simple vendeur n'a pas (lot 7). Il est renvoyé vers un responsable au lieu d'un bouton absent.
export function unlimitedReservationNote(canManageOrders: boolean, advance: number): string {
  return canManageOrders
    ? `L'appareil est gardé sans date limite. Depuis la commande, envoyez ensuite le numéro BaridiMob au client (il le voit dans son suivi), puis confirmez l'avance de ${formatPrice(advance)} quand elle arrive.`
    : `L'appareil est gardé sans date limite. Un responsable des commandes enverra ensuite le numéro BaridiMob au client et confirmera l'avance de ${formatPrice(advance)} quand elle arrive.`;
}

// Le corps de POST /admin/orders.
export function buildPhoneOrderBody(
  input: { lines: TicketLine[]; form: SaleForm; note: string; acceptLimitations: boolean },
  draft: PhoneOrderDraft,
) {
  const note = input.note.trim();
  const common = {
    fullName: input.form.fullName.trim(),
    phone: input.form.phone.trim(),
    ...(note ? { note } : {}),
    acceptLimitations: input.acceptLimitations,
    lines: ticketLinesBody(input.lines),
  };
  if (draft.fulfillment === "delivery") {
    return {
      fulfillment: "delivery" as const,
      ...common,
      wilaya: draft.wilaya,
      commune: draft.commune.trim(),
      address: draft.address.trim(),
      ...(Number.isNaN(draft.shippingFee) ? {} : { shippingFee: draft.shippingFee }),
    };
  }
  return {
    fulfillment: "pickup" as const,
    ...common,
    reservationMode: draft.reservationMode,
    ...(draft.reservationMode === "two_days" ? { pickupDate: draft.pickupDate, pickupTime: draft.pickupTime } : {}),
  };
}

export type PhoneOrderBody = ReturnType<typeof buildPhoneOrderBody>;
