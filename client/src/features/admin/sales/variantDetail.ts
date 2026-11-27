import { MASKED_COST } from "@/features/admin/costs/costVisibility";
import { formatPrice } from "@/lib/format";
import type { VariantHit } from "./ticket";

// Ce que le bouton « Détail » de la vente montre (18/11) : une ligne par information de la fiche de l'appareil,
// pour que le vendeur réponde au client qui demande « il a quoi, cet appareil ? ». Fonction pure : la fenêtre
// ne fait que les afficher.
export type DetailRow = { label: string; value: string };

const list = (items: string[], empty: string) => (items.length > 0 ? items.join(", ") : empty);

const BOX = { true: "Avec sa boîte d'origine", false: "Sans sa boîte d'origine", null: "Boîte non précisée" };

// `showCost` : le prix d'achat n'est montré qu'avec le code des prix d'achat (27/11) ; sinon la ligne est cachée par des points.
export function variantDetailRows(source: VariantHit, options: { showCost: boolean }): DetailRow[] {
  // Le client peut passer en ligne avant l'API : une réponse sans les nouveaux champs se lit comme « rien ».
  const hit = {
    ...source,
    replacedParts: source.replacedParts ?? [],
    compatibleParts: source.compatibleParts ?? [],
    defects: source.defects ?? [],
    limitations: source.limitations ?? [],
    gifts: source.gifts ?? [],
    purchasePrice: source.purchasePrice ?? null,
  };
  const rows: DetailRow[] = [];
  const add = (label: string, value: string) => rows.push({ label, value });

  if (hit.condition === "new") {
    add("État", "Neuf scellé");
  } else {
    add("Note", hit.grade === null ? "non précisée" : `${hit.grade}/10`);
    add("Batterie", hit.batteryHealth === null ? "non mesurée" : `${hit.batteryHealth} %`);
    // Une pièce changée est « compatible » (pas d'origine) ou « d'origine » (celle du fabricant).
    const replaced = hit.replacedParts.map((part) => `${part} (${hit.compatibleParts.includes(part) ? "compatible" : "d'origine"})`);
    add("Pièces changées", list(replaced, "aucune"));
    add("Défauts", list(hit.defects, "aucun"));
    add("Limitations", list(hit.limitations, "aucune"));
    add("Boîte", BOX[`${hit.withBox}`]);
  }

  add("Garantie", hit.warrantyMonths === null ? "aucune" : `${hit.warrantyMonths} mois`);
  if (hit.origin) add("Origine", hit.origin);
  if (hit.reference) add("Référence", hit.reference);
  if (hit.details) add("Détails", hit.details);
  if (hit.gifts.length > 0) add("Cadeaux offerts", hit.gifts.map((gift) => `${gift.quantity} × ${gift.name}`).join(", "));

  add("Stock", `${hit.stock} en stock`);
  add("Prix de vente", formatPrice(hit.price));
  add("Prix d'achat", hit.purchasePrice === null ? "non renseigné" : options.showCost ? formatPrice(hit.purchasePrice) : MASKED_COST);
  return rows;
}
