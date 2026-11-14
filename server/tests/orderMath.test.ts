import { describe, expect, it } from "vitest";
import { correctionMovements, describeEdit, orderProfit, stockDeltas } from "../src/modules/orders/orderMath.js";

// Les calculs du lot 2 (15/11), sans base de données.
describe("stockDeltas", () => {
  it("prend en stock ce qui augmente", () => {
    expect(stockDeltas([{ sku: "A", quantity: 1 }], [{ sku: "A", quantity: 3 }])).toEqual(new Map([["A", 2]]));
  });

  it("rend en stock ce qui diminue", () => {
    expect(stockDeltas([{ sku: "A", quantity: 3 }], [{ sku: "A", quantity: 1 }])).toEqual(new Map([["A", -2]]));
  });

  it("rend l'ancien article et prend le nouveau quand on remplace", () => {
    expect(stockDeltas([{ sku: "A", quantity: 2 }], [{ sku: "B", quantity: 2 }])).toEqual(
      new Map([
        ["A", -2],
        ["B", 2],
      ]),
    );
  });

  it("ne dit rien quand rien ne change", () => {
    expect(stockDeltas([{ sku: "A", quantity: 2 }], [{ sku: "A", quantity: 2 }]).size).toBe(0);
  });

  it("additionne un SKU présent deux fois", () => {
    expect(
      stockDeltas(
        [{ sku: "A", quantity: 1 }],
        [
          { sku: "A", quantity: 1 },
          { sku: "A", quantity: 1 },
        ],
      ),
    ).toEqual(new Map([["A", 1]]));
  });
});

describe("correctionMovements", () => {
  it("corrige la baisse d'un prix sur le même moyen", () => {
    expect(correctionMovements({ cash: 299_000 }, 290_000, "cash")).toEqual([{ method: "cash", amount: -9_000 }]);
  });

  it("déplace l'argent d'un moyen à l'autre quand seul le moyen change", () => {
    expect(correctionMovements({ cash: 299_000 }, 299_000, "card")).toEqual([
      { method: "cash", amount: -299_000 },
      { method: "card", amount: 299_000 },
    ]);
  });

  it("ne fait rien quand rien ne change", () => {
    expect(correctionMovements({ cash: 299_000 }, 299_000, "cash")).toEqual([]);
  });

  it("ramène un paiement en deux moyens sur un seul, la somme suit le nouveau total", () => {
    const result = correctionMovements({ cash: 100_000, ccp: 50_000 }, 140_000, "card");
    expect(result).toHaveLength(3);
    expect(result.reduce((sum, line) => sum + line.amount, 0)).toBe(-10_000);
    expect(result).toContainEqual({ method: "card", amount: 140_000 });
  });

  it("rembourse tout quand le nouveau total est zéro", () => {
    expect(correctionMovements({ cash: 50_000 }, 0, "cash")).toEqual([{ method: "cash", amount: -50_000 }]);
  });
});

describe("orderProfit", () => {
  it("fait (prix accordé − prix d'achat) × quantité", () => {
    expect(orderProfit([{ unitPrice: 100, unitCost: 80, quantity: 2 }])).toBe(40);
  });

  it("retire le coût d'un cadeau à 0 DA", () => {
    expect(
      orderProfit([
        { unitPrice: 100, unitCost: 80, quantity: 2 },
        { unitPrice: 0, unitCost: 10, quantity: 1 },
      ]),
    ).toBe(30);
  });

  it("est inconnu dès qu'un prix d'achat manque, jamais un faux chiffre", () => {
    expect(
      orderProfit([
        { unitPrice: 100, unitCost: 80, quantity: 1 },
        { unitPrice: 50, unitCost: null, quantity: 1 },
      ]),
    ).toBeNull();
  });

  it("est inconnu sans aucune ligne", () => {
    expect(orderProfit([])).toBeNull();
  });
});

describe("describeEdit", () => {
  const line = (over: Partial<{ sku: string; name: string; quantity: number; unitPrice: number }> = {}) => ({
    sku: "A",
    name: "iPhone 15",
    quantity: 1,
    unitPrice: 299_000,
    ...over,
  });

  it("dit le changement de quantité", () => {
    expect(describeEdit([line()], [line({ quantity: 2 })])).toEqual(["Quantité de iPhone 15 : 1 → 2"]);
  });

  it("dit le changement de prix avec les milliers lisibles", () => {
    expect(describeEdit([line()], [line({ unitPrice: 290_000 })])).toEqual(["Prix de iPhone 15 : 299 000 → 290 000 DA"]);
  });

  it("dit un article ajouté et un article retiré", () => {
    const coque = line({ sku: "C", name: "Coque", unitPrice: 1_000 });
    expect(describeEdit([line()], [line(), coque])).toEqual(["Ajouté : Coque × 1"]);
    expect(describeEdit([line(), coque], [line()])).toEqual(["Retiré : Coque"]);
  });

  it("ne dit rien quand rien ne change", () => {
    expect(describeEdit([line()], [line()])).toEqual([]);
  });
});
