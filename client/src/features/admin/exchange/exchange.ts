import { formatPrice } from "@/lib/format";
import type { PaymentMethod, ProductKind } from "@/types/api";
import { missingBox, missingPartOrigins, emptyVariant, invalidWarranty, variantBody, type VariantDraft } from "@/features/admin/products/productDraft";
import { buildSaleBody, MAX_UNIT_PRICE, type SaleForm, type TicketLine } from "@/features/admin/sales/ticket";

// L'échange du comptoir (lot 5, 15/11) : le client rend un téléphone (la reprise) et en prend un autre.
// Fonctions pures : la différence d'argent, ce que la page refuse tout de suite, ce qui part vers l'API.

// La reprise saisie à l'écran. Le prix de reprise est saisi à la main, en texte tant qu'on tape : c'est
// le magasin qui décide ce qu'il donne au client pour son téléphone, rien n'est calculé ni suggéré.
// `variant` porte la fiche d'état (la même que celle d'une affaire du catalogue), les options (Stockage,
// Couleur…), la garantie et l'origine.
export type TradeInDraft = {
  kind: ProductKind;
  model: { id: number; brand: string; name: string; colors: string[] } | null;
  variant: VariantDraft;
  price: string;
  // Les frais de remise en état (batterie neuve…), seulement quand on modifie une reprise avant sa mise en vente (18/11).
  repairCost: string;
};

export function emptyTradeIn(kind: ProductKind = "phone"): TradeInDraft {
  return { kind, model: null, variant: emptyVariant("refurbished", kind), price: "", repairCost: "" };
}

// Ce que le client paie en plus (positif) ou ce que le magasin lui rend (négatif) : le prix de ce que le
// magasin donne moins le prix de reprise.
export const exchangeDifference = (total: number, tradeInPrice: number): number => total - tradeInPrice;

export function differenceText(difference: number): string {
  if (difference > 0) return `Le client doit encore payer ${formatPrice(difference)}`;
  if (difference < 0) return `Le magasin rend ${formatPrice(-difference)} au client`;
  return "Aucune différence à payer";
}

// La même différence, dite au passé quand l'échange est fait (détail d'une commande de l'historique).
export function settledText(difference: number): string {
  if (difference > 0) return `Payé par le client : ${formatPrice(difference)}`;
  if (difference < 0) return `Rendu au client : ${formatPrice(-difference)}`;
  return "Aucune différence à payer";
}

// Le prix de reprise tapé, en nombre ; NaN tant qu'il est vide ou n'est pas un entier de dinars.
export function tradeInPrice(draft: TradeInDraft): number {
  const text = draft.price.trim();
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

// Ce que l'API refuserait de toute façon, dit tout de suite en français. Le premier problème seulement.
export function tradeInProblem(draft: TradeInDraft): string | null {
  if (!draft.model) return "Choisissez le modèle du téléphone repris.";
  if (!draft.variant.options.Couleur) return "Choisissez la couleur du téléphone repris.";
  const price = tradeInPrice(draft);
  if (Number.isNaN(price) || price > MAX_UNIT_PRICE) {
    return "Le prix de reprise : un nombre entier de dinars, de 0 à 10 000 000, saisi par le magasin.";
  }
  if (missingBox(draft.variant)) return "Dites si le téléphone repris a sa boîte d'origine.";
  if (draft.variant.warrantyMonths.trim() === "" || invalidWarranty(draft.variant)) {
    return "Indiquez la garantie de l'affaire, de 1 à 36 mois.";
  }
  const unknownParts = missingPartOrigins(draft.variant);
  if (unknownParts.length > 0) {
    return `Dites si la pièce « ${unknownParts[0]} » est d'origine ou compatible.`;
  }
  return null;
}

// La reprise telle que l'API l'attend : la fiche d'état de la variante, sans SKU ni stock (la mise en
// vente les crée), et la couleur à part des autres options.
export function buildTradeInBody(draft: TradeInDraft) {
  const sheet = variantBody({ ...draft.variant, sku: "REPRISE", price: "0", stock: "1" });
  const { Couleur: color, ...options } = sheet.options;
  return {
    deviceModelId: draft.model!.id,
    color,
    price: tradeInPrice(draft),
    options,
    grade: sheet.grade,
    batteryHealth: sheet.batteryHealth,
    replacedParts: sheet.replacedParts,
    compatibleParts: sheet.compatibleParts,
    defects: sheet.defects,
    limitations: sheet.limitations,
    withBox: sheet.withBox,
    details: sheet.details,
    warrantyMonths: sheet.warrantyMonths,
    origin: sheet.origin,
  };
}

// Le corps de POST /admin/exchanges : le ticket de ce que le magasin donne (celui de la vente au
// magasin) et la reprise du client.
export function buildExchangeBody(input: {
  lines: TicketLine[];
  form: SaleForm;
  method: PaymentMethod;
  note: string;
  acceptLimitations: boolean;
  tradeIn: TradeInDraft;
}) {
  const { tradeIn, ...ticket } = input;
  return { ...buildSaleBody(ticket), tradeIn: buildTradeInBody(tradeIn) };
}
