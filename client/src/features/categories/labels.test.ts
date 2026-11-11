import { describe, expect, it } from "vitest";
import { countLabel, startingPrice } from "./labels";

describe("countLabel", () => {
  it("compte des modèles pour les appareils et des produits pour le reste", () => {
    expect(countLabel("laptop", 127)).toBe("127 modèles");
    expect(countLabel("phone", 1)).toBe("1 modèle");
    expect(countLabel("accessory", 12)).toBe("12 produits");
    expect(countLabel("accessory", 1)).toBe("1 produit");
  });
});

describe("startingPrice", () => {
  it("écrit « dès » avec le prix en dinars", () => {
    // Le séparateur de milliers de fr-FR est une espace insécable : on la remplace par une espace.
    expect(startingPrice(38000)?.replace(/\s/g, " ")).toBe("dès 38 000 DA");
  });

  it("ne dit rien sans prix", () => {
    expect(startingPrice(null)).toBeNull();
    expect(startingPrice(0)).toBeNull();
  });
});
