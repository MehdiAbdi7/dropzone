// Les règles pures de l'atelier (18/11, étape 2) : sans base ni réseau, donc testables seules.

export type Status = "received" | "quote" | "in_repair" | "ready" | "to_return" | "returned";

// Le nom de chaque étape, dans les messages d'erreur et le suivi.
export const STATUS_LABELS: Record<Status, string> = {
  received: "Reçu",
  quote: "Devis à valider",
  in_repair: "En réparation",
  ready: "Prêt",
  to_return: "À rendre sans réparation",
  returned: "Rendu",
};

// Où peut aller une fiche depuis son étape. Reçu mène au devis, ou directement à la réparation (le client a dit
// oui au comptoir, ou l'appareil est sous garantie : pas de devis à faire valider). « En réparation » revenant à
// « Devis » (une pièce de plus, hors garantie) n'est pas un bouton : le service le fait tout seul.
export function nextStatuses(from: Status, underWarranty: boolean): Status[] {
  switch (from) {
    case "received":
      return underWarranty ? ["in_repair"] : ["quote", "in_repair"];
    case "quote":
      return ["in_repair", "to_return"];
    case "in_repair":
      return ["ready"];
    case "ready":
    case "to_return":
      return ["returned"];
    case "returned":
      return [];
  }
}

// Ce que le client paie pour la réparation : les pièces au prix de vente plus la main-d'œuvre. Le prix d'une
// fiche sous garantie est ignoré par l'affichage ; l'argent viendra à l'étape 3.
export function quoteTotal(laborPrice: number | null, lines: { quantity: number; unitPrice: number }[]): number {
  return (laborPrice ?? 0) + lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

// Ce que le client paie au Rendu (étape 3). Sous garantie, rien. Un devis refusé : seulement les frais de diagnostic
// saisis à la main (la main-d'œuvre du devis refusé est remise à zéro au refus, les pièces ne comptent jamais).
// Sinon : la main-d'œuvre plus les pièces au prix de vente figé.
export function repairAmount(input: {
  underWarranty: boolean;
  refused: boolean;
  laborPrice: number | null;
  lines: { quantity: number; unitPrice: number }[];
}): number {
  if (input.underWarranty) return 0;
  if (input.refused) return input.laborPrice ?? 0;
  return quoteTotal(input.laborPrice, input.lines);
}

// Le bénéfice d'une réparation rendue : ce que le client a payé moins ce que les pièces ont coûté. Négatif sous
// garantie : le magasin a payé les pièces sans rien encaisser.
export const repairProfit = (paid: number, partsCost: number): number => paid - partsCost;

// Le devis est fixé dès qu'il y a une main-d'œuvre (même 0 : « la réparation est gratuite ») ou une pièce.
export function hasQuote(laborPrice: number | null, lineCount: number): boolean {
  return laborPrice !== null || lineCount > 0;
}
