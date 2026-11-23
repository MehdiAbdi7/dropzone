import { describe, expect, it } from "vitest";
import { emptyVariant, type VariantDraft } from "./productDraft";
import { variantGroups, variantProblems } from "./variantGroups";

// La fiche produit en fenêtres (23/11) : le neuf scellé et l'occasion dans deux listes séparées.
const variant = (condition: VariantDraft["condition"], patch: Partial<VariantDraft> = {}): VariantDraft => ({
  ...emptyVariant(condition, "phone"),
  sku: `SKU-${Math.random()}`,
  price: "100000",
  ...patch,
});

describe("variantGroups", () => {
  it("sépare le neuf et l'occasion, dans l'ordre de la fiche, avec le stock de chaque liste", () => {
    const a = variant("new", { stock: "3" });
    const b = variant("refurbished", { stock: "1" });
    const c = variant("new", { stock: "2" });
    const { fresh, used } = variantGroups([a, b, c]);
    expect(fresh).toEqual({ variants: [a, c], stock: 5 });
    expect(used).toEqual({ variants: [b], stock: 1 });
  });

  it("un stock vide compte pour zéro", () => {
    expect(variantGroups([variant("new", { stock: "" })]).fresh.stock).toBe(0);
  });
});

describe("variantProblems", () => {
  it("une variante complète n'a rien à compléter", () => {
    expect(variantProblems(variant("new"))).toEqual([]);
  });

  it("signale le prix manquant", () => {
    expect(variantProblems(variant("new", { price: "" }))).toEqual(["prix"]);
  });
});
