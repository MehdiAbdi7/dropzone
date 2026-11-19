import { buildTradeInSheetBody, tradeInProblem, type TradeInDraft } from "@/features/admin/exchange/exchange";
import type { VariantHit } from "@/features/admin/sales/ticket";
import type { PaymentMethod } from "@/types/api";
import type { RepairStatus } from "./repairsView";

// Remplacer l'appareil sous garantie (atelier, étape 6, cahier §7) : fonctions pures, sans écran ni réseau. Le serveur
// refait le même calcul et reste la référence ; ici, on annonce la différence avant d'envoyer.

// L'article d'origine, tel que la fiche le donne (sans le prix payé pour le technicien, qui ne remplace pas).
export type ReplaceOrigin = { unitPrice: number; productId: number | null; storage: string | null };

// « Même modèle » : même produit ET même stockage, la couleur étant libre. Un article d'origine sans produit (supprimé
// du catalogue) n'est jamais « le même ».
export function givenModelMatches(origin: Pick<ReplaceOrigin, "productId" | "storage">, hit: Pick<VariantHit, "productId" | "options">): boolean {
  return origin.productId !== null && origin.productId === hit.productId && origin.storage === (hit.options.Stockage ?? null);
}

// Ce que le client paie (positif) ou ce que le magasin lui rend (négatif). Même modèle : rien, quel que soit le prix
// catalogue d'aujourd'hui ; sinon le prix de l'appareil donné moins le prix PAYÉ à l'origine.
export function replaceDifference(origin: ReplaceOrigin, hit: Pick<VariantHit, "productId" | "options" | "price">): number {
  return givenModelMatches(origin, hit) ? 0 : hit.price - origin.unitPrice;
}

// Le bouton « Remplacer l'appareil » : sous garantie, en cours, jamais remplacé, avec sa vente d'origine (sans elle le
// prix payé est inconnu), et seulement pour qui a le droit de vendre.
export function canReplace(
  repair: { underWarranty: boolean; status: RepairStatus; replacementOrderNumber: number | null; origin: { unitPrice?: number } | null },
  mayReplace: boolean,
): boolean {
  return mayReplace && repair.underWarranty && (repair.status === "received" || repair.status === "in_repair") && repair.replacementOrderNumber === null && repair.origin !== null;
}

// Ce que le serveur refuserait de toute façon, dit tout de suite en français. Le premier problème seulement.
export function replaceProblem(input: {
  origin: ReplaceOrigin;
  given: VariantHit | null;
  tradeIn: TradeInDraft;
  method: PaymentMethod | null;
  acceptLimitations: boolean;
}): string | null {
  if (!input.given) return "Choisissez l'appareil que le magasin donne.";
  // L'appareil en panne n'a pas de prix de reprise : il vaut 0 DA, le serveur le fixe.
  const trade = tradeInProblem({ ...input.tradeIn, price: "0" });
  if (trade) return trade.replace("du téléphone repris", "de l'appareil en panne").replace("le téléphone repris", "l'appareil en panne");
  if (replaceDifference(input.origin, input.given) !== 0 && input.method === null) return "Choisissez le moyen de paiement de la différence.";
  if (input.given.limitations.length > 0 && !input.acceptLimitations) return "Le client doit accepter les limitations de l'appareil reconditionné.";
  return null;
}

// Le corps de POST /admin/repairs/:id/replace. `method` : « cash » quand la différence est nulle (le serveur l'écrit
// avec le mouvement à 0 DA).
export function buildReplaceBody(input: { sku: string; method: PaymentMethod; acceptLimitations: boolean; tradeIn: TradeInDraft }) {
  return {
    method: input.method,
    acceptLimitations: input.acceptLimitations,
    line: { sku: input.sku },
    tradeIn: buildTradeInSheetBody(input.tradeIn),
  };
}
