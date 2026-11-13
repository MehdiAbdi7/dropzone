import type { PaymentMethod } from "../../generated/prisma/client.js";

// Les calculs du lot 2 du back-office magasin (15/11), sans base de données : faciles à tester,
// et c'est ici que se joue l'exactitude du stock et de l'argent quand on modifie une commande.

type StockLine = { sku: string; quantity: number };

function totalsBySku(lines: StockLine[]) {
  const totals = new Map<string, number>();
  for (const line of lines) {
    totals.set(line.sku, (totals.get(line.sku) ?? 0) + line.quantity);
  }
  return totals;
}

// Ce que le stock doit faire quand une commande passe de `before` à `after` : par SKU, un nombre
// positif = en prendre, négatif = en rendre. Un SKU sans changement n'apparaît pas.
export function stockDeltas(before: StockLine[], after: StockLine[]): Map<string, number> {
  const was = totalsBySku(before);
  const now = totalsBySku(after);
  const deltas = new Map<string, number>();
  for (const sku of new Set([...was.keys(), ...now.keys()])) {
    const delta = (now.get(sku) ?? 0) - (was.get(sku) ?? 0);
    if (delta !== 0) deltas.set(sku, delta);
  }
  return deltas;
}

// Les mouvements d'argent à écrire quand le total d'une commande payée change, ou quand son
// moyen de paiement change. `paid` = ce que le journal a déjà reçu pour la commande, par moyen
// (net des corrections). Tout le total corrigé est ramené sur `method` : chaque autre moyen qui
// avait de l'argent le rend, et `method` reçoit la différence. Rien à écrire = liste vide.
export function correctionMovements(
  paid: Partial<Record<PaymentMethod, number>>,
  newTotal: number,
  method: PaymentMethod,
): { method: PaymentMethod; amount: number }[] {
  const movements: { method: PaymentMethod; amount: number }[] = [];
  for (const [other, amount] of Object.entries(paid) as [PaymentMethod, number][]) {
    if (other !== method && amount !== 0) movements.push({ method: other, amount: -amount });
  }
  const difference = newTotal - (paid[method] ?? 0);
  if (difference !== 0) movements.push({ method, amount: difference });
  return movements;
}

// Le bénéfice d'une commande : (prix accordé − prix d'achat copié à la vente) × quantité, cadeaux
// compris (leur coût est réel), frais de livraison exclus (le coût du livreur n'est pas connu).
// `null` quand un prix d'achat manque : on n'invente pas un chiffre.
export function orderProfit(lines: { unitPrice: number; unitCost: number | null; quantity: number }[]): number | null {
  if (lines.length === 0 || lines.some((line) => line.unitCost === null)) return null;
  return lines.reduce((sum, line) => sum + (line.unitPrice - (line.unitCost as number)) * line.quantity, 0);
}

type EditLine = { sku: string; name: string; quantity: number; unitPrice: number };

// Les milliers séparés par une espace : 299000 → « 299 000 ».
const grouped = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// Les changements d'une modification, en phrases, pour la trace de la commande.
export function describeEdit(before: EditLine[], after: EditLine[]): string[] {
  const phrases: string[] = [];
  const next = new Map(after.map((line) => [line.sku, line]));
  const known = new Set(before.map((line) => line.sku));
  for (const line of before) {
    const updated = next.get(line.sku);
    if (!updated) {
      phrases.push(`Retiré : ${line.name}`);
      continue;
    }
    if (updated.quantity !== line.quantity) {
      phrases.push(`Quantité de ${line.name} : ${line.quantity} → ${updated.quantity}`);
    }
    if (updated.unitPrice !== line.unitPrice) {
      phrases.push(`Prix de ${line.name} : ${grouped(line.unitPrice)} → ${grouped(updated.unitPrice)} DA`);
    }
  }
  for (const line of after) {
    if (!known.has(line.sku)) phrases.push(`Ajouté : ${line.name} × ${line.quantity}`);
  }
  return phrases;
}
