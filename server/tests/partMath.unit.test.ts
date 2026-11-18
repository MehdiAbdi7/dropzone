import { describe, expect, it } from "vitest";
import { weightedAveragePrice } from "../src/modules/parts/partMath.js";

// Le prix d'achat d'une pièce après un arrivage : la moyenne pondérée de ce qu'il y a et de ce qui arrive.
describe("weightedAveragePrice", () => {
  it("2 en stock à 3 500, arrivage de 2 à 0 : 1 750 (l'exemple du cahier)", () => {
    expect(weightedAveragePrice({ stock: 2, price: 3_500 }, { quantity: 2, unitCost: 0 })).toBe(1_750);
  });

  it("2 à 3 000, arrivage de 3 à 4 000 : 3 600", () => {
    expect(weightedAveragePrice({ stock: 2, price: 3_000 }, { quantity: 3, unitCost: 4_000 })).toBe(3_600);
  });

  it("sans stock, le prix devient celui de l'arrivage, même à 0", () => {
    expect(weightedAveragePrice({ stock: 0, price: 5_000 }, { quantity: 4, unitCost: 0 })).toBe(0);
    expect(weightedAveragePrice({ stock: 0, price: 5_000 }, { quantity: 4, unitCost: 2_500 })).toBe(2_500);
  });

  it("arrondit au dinar le plus proche, la moitié vers le haut", () => {
    expect(weightedAveragePrice({ stock: 1, price: 3_000 }, { quantity: 2, unitCost: 3_001 })).toBe(3_001);
    expect(weightedAveragePrice({ stock: 1, price: 3_000 }, { quantity: 1, unitCost: 3_001 })).toBe(3_001);
  });

  it("ne donne jamais NaN ni Infinity, aux bornes", () => {
    for (const stock of [0, 10_000]) {
      for (const price of [0, 10_000_000]) {
        for (const quantity of [1, 10_000]) {
          for (const unitCost of [0, 10_000_000]) {
            const result = weightedAveragePrice({ stock, price }, { quantity, unitCost });
            expect(Number.isFinite(result), `${stock} ${price} ${quantity} ${unitCost}`).toBe(true);
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(10_000_000);
          }
        }
      }
    }
  });
});
