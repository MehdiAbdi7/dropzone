import type { PaymentMethod } from "../../generated/prisma/client.js";

const METHODS: PaymentMethod[] = ["cash", "baridimob", "ccp", "card", "transfer"];

// Le résumé d'une journée de caisse (14/11), sans base de données : facile à tester.
// - cashIn : ce que les mouvements en ESPÈCES ont fait entrer (ou sortir) dans le tiroir ;
// - expectedCash : ce qui devrait être dans le tiroir (fond + cashIn) ;
// - entered : ce qui est vraiment rentré d'après le comptage (compté − fond) ;
// - gap : compté − attendu (négatif = il manque de l'argent).
// Les autres moyens (BaridiMob, CCP…) entrent dans le total du jour, pas dans le tiroir.
export function cashSummary(
  day: { openingFloat: number; countedCash: number | null },
  movements: { amount: number; method: PaymentMethod }[],
) {
  const byMethod = Object.fromEntries(METHODS.map((method) => [method, 0])) as Record<PaymentMethod, number>;
  for (const movement of movements) {
    byMethod[movement.method] += movement.amount;
  }
  const cashIn = byMethod.cash;
  const expectedCash = day.openingFloat + cashIn;
  const counted = day.countedCash;
  return {
    openingFloat: day.openingFloat,
    cashIn,
    expectedCash,
    byMethod,
    total: METHODS.reduce((sum, method) => sum + byMethod[method], 0),
    countedCash: counted,
    entered: counted === null ? null : counted - day.openingFloat,
    gap: counted === null ? null : counted - expectedCash,
  };
}
