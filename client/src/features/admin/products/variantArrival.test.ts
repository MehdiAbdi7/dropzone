import { describe, expect, it } from "vitest";
import { MAX_VARIANT_STOCK, arrivalBody, arrivalPreview, arrivalProblem, emptyArrival, needsCurrentCost } from "./variantArrival";

// Un arrivage de neuf dans le back-office (27/11) : un neuf acheté à un autre prix reste UNE variante, son prix d'achat devient
// la moyenne pondérée. Les mêmes règles que l'API.

const draft = (patch: Partial<typeof emptyArrival>) => ({ ...emptyArrival, ...patch });
// 3 iPhone neufs en rayon, achetés 350 000 DA l'unité.
const inStock = { stock: 3, purchasePrice: 350_000 };

describe("arrivalPreview", () => {
  it("3 à 350 000 puis 5 à 340 000 : 8 en stock, prix d'achat moyen 343 750 DA", () => {
    expect(arrivalPreview(inStock, draft({ quantity: "5", unitCost: "340000" }))).toEqual({ stock: 8, average: 343_750 });
  });

  it("arrondit au dinar", () => {
    expect(arrivalPreview({ stock: 2, purchasePrice: 100 }, draft({ quantity: "1", unitCost: "101" }))).toEqual({ stock: 3, average: 100 });
  });

  it("un lot offert à 0 DA fait baisser la moyenne", () => {
    expect(arrivalPreview(inStock, draft({ quantity: "3", unitCost: "0" }))).toEqual({ stock: 6, average: 175_000 });
  });

  it("sans stock, le prix devient celui de l'arrivage", () => {
    expect(arrivalPreview({ stock: 0, purchasePrice: 350_000 }, draft({ quantity: "4", unitCost: "340000" }))).toEqual({ stock: 4, average: 340_000 });
    expect(arrivalPreview({ stock: 0, purchasePrice: null }, draft({ quantity: "4", unitCost: "340000" }))).toEqual({ stock: 4, average: 340_000 });
  });

  it("quand le prix du stock actuel est inconnu, la moyenne part du prix que le gérant donne", () => {
    const unknown = { stock: 3, purchasePrice: null };
    expect(arrivalPreview(unknown, draft({ quantity: "5", unitCost: "340000", currentUnitCost: "350000" }))).toEqual({ stock: 8, average: 343_750 });
  });

  it("n'a rien à montrer tant que le formulaire est incomplet", () => {
    expect(arrivalPreview(inStock, emptyArrival)).toBeNull();
    expect(arrivalPreview(inStock, draft({ quantity: "5" }))).toBeNull();
    expect(arrivalPreview(inStock, draft({ unitCost: "340000" }))).toBeNull();
    expect(arrivalPreview({ stock: 3, purchasePrice: null }, draft({ quantity: "5", unitCost: "340000" }))).toBeNull();
  });
});

describe("needsCurrentCost", () => {
  it("n'est demandé que pour du stock en rayon dont le prix d'achat est inconnu", () => {
    expect(needsCurrentCost({ stock: 3, purchasePrice: null })).toBe(true);
    expect(needsCurrentCost({ stock: 3, purchasePrice: 350_000 })).toBe(false);
    expect(needsCurrentCost({ stock: 0, purchasePrice: null })).toBe(false);
    expect(needsCurrentCost({ stock: 3, purchasePrice: 0 })).toBe(false);
  });
});

describe("arrivalProblem", () => {
  it("accepte un arrivage correct", () => {
    expect(arrivalProblem(inStock, draft({ quantity: "5", unitCost: "340000" }))).toBeNull();
    expect(arrivalProblem(inStock, draft({ quantity: "5", unitCost: "0" }))).toBeNull();
  });

  it("refuse une quantité qui n'en est pas une", () => {
    for (const quantity of ["", "0", "1.5", "-2", "10001", "abc"]) {
      expect(arrivalProblem(inStock, draft({ quantity, unitCost: "1000" })), quantity).toContain("quantité");
    }
  });

  it("refuse un stock au-dessus du plafond, et accepte le plafond pile", () => {
    expect(MAX_VARIANT_STOCK).toBe(10_000);
    expect(arrivalProblem(inStock, draft({ quantity: "9998", unitCost: "1000" }))).toContain("10000");
    expect(arrivalProblem(inStock, draft({ quantity: "9997", unitCost: "1000" }))).toBeNull();
  });

  it("refuse un prix d'achat qui n'en est pas un", () => {
    for (const unitCost of ["", "-1", "10000001", "mille", "1.5"]) {
      expect(arrivalProblem(inStock, draft({ quantity: "5", unitCost })), unitCost).toContain("prix d'achat unitaire");
    }
  });

  it("demande le prix du stock actuel quand il est inconnu", () => {
    const unknown = { stock: 3, purchasePrice: null };
    expect(arrivalProblem(unknown, draft({ quantity: "5", unitCost: "340000" }))).toContain("stock actuel");
    expect(arrivalProblem(unknown, draft({ quantity: "5", unitCost: "340000", currentUnitCost: "350000" }))).toBeNull();
  });
});

describe("arrivalBody", () => {
  it("envoie la quantité et le prix, en nombres", () => {
    expect(arrivalBody(inStock, draft({ quantity: "5", unitCost: "340000" }))).toEqual({ quantity: 5, unitCost: 340_000 });
  });

  it("n'envoie le prix du stock actuel que s'il a été demandé", () => {
    expect(arrivalBody(inStock, draft({ quantity: "5", unitCost: "340000", currentUnitCost: "1" }))).toEqual({ quantity: 5, unitCost: 340_000 });
    expect(arrivalBody({ stock: 3, purchasePrice: null }, draft({ quantity: "5", unitCost: "340000", currentUnitCost: "350000" }))).toEqual({
      quantity: 5,
      unitCost: 340_000,
      currentUnitCost: 350_000,
    });
  });
});
