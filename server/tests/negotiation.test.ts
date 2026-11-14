import { describe, expect, it } from "vitest";
import { applyPrices, PriceError, priceReduction, reductionLabel } from "../src/modules/orders/negotiation.js";

// La négociation des prix (16/11, lot 3), sans base de données.
const line = (over: Partial<Parameters<typeof applyPrices>[0][number]> = {}) => ({
  id: 1,
  name: "iPhone 15",
  quantity: 1,
  unitPrice: 299_000,
  listPrice: null as number | null,
  isGift: false,
  ...over,
});

describe("applyPrices", () => {
  it("change un prix : prix accordé, prix catalogue fixé, sous-total recalculé", () => {
    const result = applyPrices([line()], [{ id: 1, unitPrice: 290_000 }]);
    expect(result.lines[0]).toMatchObject({ unitPrice: 290_000, listPrice: 299_000 });
    expect(result.changes).toEqual([{ id: 1, name: "iPhone 15", from: 299_000, to: 290_000 }]);
    expect(result.subtotal).toBe(290_000);
  });

  it("garde le prix catalogue déjà connu", () => {
    const result = applyPrices([line({ unitPrice: 290_000, listPrice: 299_000 })], [{ id: 1, unitPrice: 285_000 }]);
    expect(result.lines[0]).toMatchObject({ unitPrice: 285_000, listPrice: 299_000 });
  });

  it("ne fait rien quand le prix ne change pas", () => {
    const result = applyPrices([line()], [{ id: 1, unitPrice: 299_000 }]);
    expect(result.changes).toEqual([]);
    expect(result.lines[0].listPrice).toBeNull();
  });

  it("compte la quantité et laisse les cadeaux à 0 dans le sous-total", () => {
    const result = applyPrices(
      [line({ quantity: 2 }), line({ id: 2, name: "Chargeur", unitPrice: 0, isGift: true })],
      [{ id: 1, unitPrice: 100_000 }],
    );
    expect(result.subtotal).toBe(200_000);
  });

  it("refuse un cadeau, une ligne inconnue, un prix non entier ou hors limites, un doublon", () => {
    const gift = line({ id: 2, name: "Chargeur", unitPrice: 0, isGift: true });
    expect(() => applyPrices([line(), gift], [{ id: 2, unitPrice: 100 }])).toThrow(/cadeau/);
    expect(() => applyPrices([line()], [{ id: 99, unitPrice: 100 }])).toThrow(PriceError);
    expect(() => applyPrices([line()], [{ id: 1, unitPrice: 10.5 }])).toThrow(/entier/);
    expect(() => applyPrices([line()], [{ id: 1, unitPrice: -1 }])).toThrow(PriceError);
    expect(() => applyPrices([line()], [{ id: 1, unitPrice: 10_000_001 }])).toThrow(PriceError);
    expect(() =>
      applyPrices([line()], [{ id: 1, unitPrice: 1 }, { id: 1, unitPrice: 2 }]),
    ).toThrow(PriceError);
  });

  it("accepte un prix à 0 et le prix maximum", () => {
    expect(applyPrices([line()], [{ id: 1, unitPrice: 0 }]).subtotal).toBe(0);
    expect(applyPrices([line()], [{ id: 1, unitPrice: 10_000_000 }]).subtotal).toBe(10_000_000);
  });
});

describe("priceReduction", () => {
  it("additionne (prix catalogue − prix accordé) × quantité", () => {
    expect(
      priceReduction([
        { unitPrice: 290_000, listPrice: 299_000, quantity: 1 },
        { unitPrice: 1_500, listPrice: 2_000, quantity: 3 },
      ]),
    ).toBe(9_000 + 1_500);
  });

  it("vaut 0 sans réduction, et ignore une ligne sans prix catalogue", () => {
    expect(priceReduction([{ unitPrice: 100, listPrice: 100, quantity: 2 }])).toBe(0);
    expect(priceReduction([{ unitPrice: 100, listPrice: null, quantity: 2 }])).toBe(0);
  });

  it("est négative quand le prix dépasse le catalogue", () => {
    expect(priceReduction([{ unitPrice: 105_000, listPrice: 100_000, quantity: 1 }])).toBe(-5_000);
  });
});

describe("reductionLabel", () => {
  it("écrit la réduction : ancien prix, nouveau prix, différence", () => {
    expect(reductionLabel({ unitPrice: 290_000, listPrice: 299_000 })).toBe("299 000 → 290 000 DA, −9 000");
  });
  it("écrit une hausse avec un plus", () => {
    expect(reductionLabel({ unitPrice: 105_000, listPrice: 100_000 })).toBe("100 000 → 105 000 DA, +5 000");
  });
  it("ne dit rien sans réduction ni prix catalogue", () => {
    expect(reductionLabel({ unitPrice: 100, listPrice: 100 })).toBeNull();
    expect(reductionLabel({ unitPrice: 100, listPrice: null })).toBeNull();
  });
});
