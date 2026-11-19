import { describe, expect, it } from "vitest";
import { isSameModel, replacementDifference, replacementProfit } from "../src/modules/repairs/replacementRules.js";

// Le remplacement sous garantie (atelier, étape 6) : les trois règles d'argent et de « même modèle », sans base.
describe("isSameModel", () => {
  it("même produit et même stockage : le même modèle", () => {
    expect(isSameModel({ productId: 4, storage: "128 Go" }, { productId: 4, storage: "128 Go" })).toBe(true);
  });
  it("même produit mais un autre stockage : pas le même modèle", () => {
    expect(isSameModel({ productId: 4, storage: "128 Go" }, { productId: 4, storage: "256 Go" })).toBe(false);
  });
  it("un autre produit : pas le même modèle", () => {
    expect(isSameModel({ productId: 4, storage: "128 Go" }, { productId: 5, storage: "128 Go" })).toBe(false);
  });
  it("sans stockage des deux côtés (un PC) : le même produit suffit", () => {
    expect(isSameModel({ productId: 4, storage: null }, { productId: 4, storage: null })).toBe(true);
  });
  it("article d'origine sans produit (supprimé) : jamais le même modèle", () => {
    expect(isSameModel({ productId: null, storage: "128 Go" }, { productId: 4, storage: "128 Go" })).toBe(false);
  });
});

describe("replacementDifference", () => {
  it("même modèle : 0, quel que soit le prix catalogue d'aujourd'hui", () => {
    expect(replacementDifference({ sameModel: true, paidPrice: 80_000, givenPrice: 95_000 })).toBe(0);
  });
  it("autre modèle plus cher : le client paie la différence", () => {
    expect(replacementDifference({ sameModel: false, paidPrice: 80_000, givenPrice: 90_000 })).toBe(10_000);
  });
  it("autre modèle moins cher : le magasin rend la différence (négatif)", () => {
    expect(replacementDifference({ sameModel: false, paidPrice: 80_000, givenPrice: 70_000 })).toBe(-10_000);
  });
});

describe("replacementProfit", () => {
  it("le client paie 10 000 et l'appareil donné a coûté 70 000 : −60 000, jamais 90 000 − 70 000", () => {
    expect(replacementProfit(10_000, 70_000)).toBe(-60_000);
  });
  it("même modèle : −(prix d'achat de l'appareil donné)", () => {
    expect(replacementProfit(0, 70_000)).toBe(-70_000);
  });
  it("le magasin rend 10 000 : −différence − prix d'achat", () => {
    expect(replacementProfit(-10_000, 50_000)).toBe(-60_000);
  });
});
