import { describe, expect, it } from "vitest";
import { emptyVariant, type VariantDraft } from "./productDraft";
import { byColor, optionsWithoutColor, variantGroups, variantProblems } from "./variantGroups";

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

// 23/11 (remarque de Mehdi) : les couleurs se repéraient mal. Dans chaque liste, les variantes sont regroupées par
// couleur, et la ligne ne répète plus la couleur.
describe("byColor", () => {
  it("regroupe par couleur dans l'ordre de la fiche, avec le stock de chaque couleur, les sans couleur à la fin", () => {
    const noir1 = variant("new", { options: { Couleur: "Noir", Stockage: "128 Go" }, stock: "2" });
    const sans = variant("new", { options: { Stockage: "64 Go" }, stock: "1" });
    const bleu = variant("new", { options: { Couleur: "Bleu", Stockage: "256 Go" }, stock: "0" });
    const noir2 = variant("new", { options: { Couleur: "Noir", Stockage: "256 Go" }, stock: "1" });
    expect(byColor([noir1, sans, bleu, noir2])).toEqual([
      { color: "Noir", variants: [noir1, noir2], stock: 3 },
      { color: "Bleu", variants: [bleu], stock: 0 },
      { color: null, variants: [sans], stock: 1 },
    ]);
  });
});

describe("optionsWithoutColor", () => {
  it("donne les autres options, le stockage en premier", () => {
    const one = variant("new", { options: { RAM: "8 Go", SIM: "Une SIM + eSIM", Couleur: "Titane noir", Stockage: "128 Go" } });
    expect(optionsWithoutColor(one)).toBe("128 Go · 8 Go · Une SIM + eSIM");
  });

  it("une variante qui n'a qu'une couleur : rien d'autre à dire", () => {
    expect(optionsWithoutColor(variant("new", { options: { Couleur: "Noir" } }))).toBe("");
  });
});
