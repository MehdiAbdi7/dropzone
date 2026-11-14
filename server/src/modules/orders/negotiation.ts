import { groupThousands } from "./orderMath.js";

// La négociation des prix (16/11, lot 3), sans base de données : facile à tester. `unitPrice` est le
// prix ACCORDÉ (celui que la caisse et les totaux comptent) ; `listPrice` est le prix catalogue
// d'origine, gardé pour montrer la réduction.

export const MAX_UNIT_PRICE = 10_000_000;

// Une erreur de saisie de prix : le service la transforme en réponse 400 avec ce message.
export class PriceError extends Error {}

export type PriceLine = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  listPrice: number | null;
  isGift: boolean;
};
export type PriceChange = { id: number; name: string; from: number; to: number };

// Applique les prix demandés à une commande. Rien n'est écrit ici : on rend les lignes d'après,
// ce qui a vraiment changé, et le sous-total.
export function applyPrices(lines: PriceLine[], prices: { id: number; unitPrice: number }[]) {
  const wanted = new Map<number, number>();
  for (const { id, unitPrice } of prices) {
    if (wanted.has(id)) throw new PriceError("Une ligne ne peut avoir qu'un seul prix");
    wanted.set(id, unitPrice);
  }

  const changes: PriceChange[] = [];
  const next = lines.map((line) => {
    const price = wanted.get(line.id);
    if (price === undefined) return line;
    if (line.isGift) throw new PriceError(`« ${line.name} » est un cadeau : son prix ne se négocie pas`);
    if (!Number.isInteger(price) || price < 0 || price > MAX_UNIT_PRICE) {
      throw new PriceError(`Prix de « ${line.name} » : un nombre entier de dinars, de 0 à ${groupThousands(MAX_UNIT_PRICE)}`);
    }
    if (price === line.unitPrice) return line;
    changes.push({ id: line.id, name: line.name, from: line.unitPrice, to: price });
    // Le premier changement fixe le prix catalogue : l'ancien prix accordé d'une commande d'avant
    // le lot 3 devient son prix catalogue.
    return { ...line, unitPrice: price, listPrice: line.listPrice ?? line.unitPrice };
  });

  for (const id of wanted.keys()) {
    if (!lines.some((line) => line.id === id)) throw new PriceError("Une ligne de la commande est inconnue");
  }
  return { lines: next, changes, subtotal: next.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) };
}

// La réduction totale d'une commande : Σ (prix catalogue − prix accordé) × quantité, sur les
// lignes dont le prix catalogue est connu. Négative quand un prix dépasse le catalogue.
export function priceReduction(lines: { unitPrice: number; listPrice: number | null; quantity: number }[]): number {
  return lines.reduce(
    (sum, line) => (line.listPrice === null ? sum : sum + (line.listPrice - line.unitPrice) * line.quantity),
    0,
  );
}

// « 299 000 → 290 000 DA, −9 000 » (ou « +5 000 » quand c'est plus cher) ; null sans réduction.
export function reductionLabel(line: { unitPrice: number; listPrice: number | null }): string | null {
  if (line.listPrice === null || line.listPrice === line.unitPrice) return null;
  const difference = line.listPrice - line.unitPrice;
  const sign = difference > 0 ? "−" : "+";
  return `${groupThousands(line.listPrice)} → ${groupThousands(line.unitPrice)} DA, ${sign}${groupThousands(Math.abs(difference))}`;
}
