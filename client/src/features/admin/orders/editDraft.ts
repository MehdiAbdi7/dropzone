import type { EditOrderBody } from "@/features/admin/api/ordersApi";
import type { PaymentMethod } from "@/types/api";

// Le brouillon de la fenêtre « Modifier la commande » (15/11, lot 2). Fonctions pures : ce que la
// fenêtre affiche (lignes payantes, total en direct) et ce qui part vers l'API.

// Une ligne en cours de modification : `id` pour une ligne de la commande, `sku` pour un article
// ajouté ; `key` sert seulement de clé React stable.
export type DraftLine = { key: string; id?: number; sku?: string; name: string; quantity: number; unitPrice: number };

// Les cadeaux ne se modifient pas (décision du lot 2) : ils n'entrent pas dans le brouillon.
export function draftFromItems(
  items: { id: number; name: string; quantity: number; unitPrice: number; isGift: boolean }[],
): DraftLine[] {
  return items
    .filter((item) => !item.isGift)
    .map((item) => ({ key: `item-${item.id}`, id: item.id, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice }));
}

// Le total de la commande modifiée : les lignes plus les frais de livraison (inchangés).
export function draftTotal(lines: DraftLine[], shippingFee: number): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) + shippingFee;
}

// Ce que l'API refuserait de toute façon, dit tout de suite en français.
export function draftProblem(lines: DraftLine[]): string | null {
  if (lines.length === 0) return "Une commande garde au moins un article : supprimez-la plutôt.";
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10) {
      return `Quantité de « ${line.name} » : de 1 à 10.`;
    }
    if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) {
      return `Prix de « ${line.name} » : un nombre entier de dinars, 0 au minimum.`;
    }
  }
  return null;
}

export function buildEditBody(input: {
  lines: DraftLine[];
  paid: boolean;
  method?: PaymentMethod;
  fullName: string;
  phone: string;
  note: string;
}): EditOrderBody {
  return {
    lines: input.lines.map((line) =>
      line.id !== undefined
        ? { id: line.id, quantity: line.quantity, unitPrice: line.unitPrice }
        : { sku: line.sku as string, quantity: line.quantity, unitPrice: line.unitPrice },
    ),
    // Une commande pas encore payée n'a pas de moyen de paiement à changer (l'API le refuse).
    ...(input.paid && input.method ? { method: input.method } : {}),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    note: input.note.trim() || null,
  };
}

// Le moyen de paiement qui porte le plus d'argent : celui que la fenêtre propose d'abord.
export function currentMethod(payments: { method: PaymentMethod; amount: number }[]): PaymentMethod {
  const byMethod = new Map<PaymentMethod, number>();
  for (const payment of payments) {
    byMethod.set(payment.method, (byMethod.get(payment.method) ?? 0) + payment.amount);
  }
  let best: PaymentMethod = "cash";
  let bestAmount = Number.NEGATIVE_INFINITY;
  for (const [method, amount] of byMethod) {
    if (amount > bestAmount) {
      best = method;
      bestAmount = amount;
    }
  }
  return best;
}
