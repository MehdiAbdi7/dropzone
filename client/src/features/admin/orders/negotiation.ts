import { MAX_UNIT_PRICE, pricesToSend } from "@/features/admin/sales/ticket";

export type NegotiableItem = {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  listPrice: number | null;
  isGift: boolean;
};

// L'état de la négociation d'une commande pas encore payée (16/11, lot 3) : `prices` = les prix saisis
// par ligne (absent = inchangé, NaN = champ vidé). Rend ce qu'on envoie, le nouveau total (frais de
// livraison gardés) et le problème éventuel. Les cadeaux ne se négocient pas : ignorés.
export function negotiationState(items: NegotiableItem[], prices: Record<number, number>, shippingFee: number) {
  const lines = items.filter((item) => !item.isGift);
  const entered = lines.map((item) => ({
    item,
    unitPrice: item.id in prices ? prices[item.id] : item.unitPrice,
  }));
  const bad = entered.find(({ unitPrice }) => !Number.isInteger(unitPrice) || unitPrice < 0 || unitPrice > MAX_UNIT_PRICE);
  if (bad) {
    // Un prix invalide : rien n'est envoyé et le total n'est pas calculé (NaN, la page affiche « — »).
    return {
      toSend: [],
      total: Number.NaN,
      problem: `Prix de « ${bad.item.name} » : un nombre entier de dinars, de 0 à 10 000 000.`,
    };
  }
  return {
    toSend: pricesToSend(entered.map(({ item, unitPrice }) => ({ id: item.id, unitPrice, originalPrice: item.unitPrice }))),
    total: entered.reduce((sum, { item, unitPrice }) => sum + unitPrice * item.quantity, 0) + shippingFee,
    problem: null as string | null,
  };
}
