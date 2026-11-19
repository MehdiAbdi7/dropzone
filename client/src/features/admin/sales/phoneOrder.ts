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
