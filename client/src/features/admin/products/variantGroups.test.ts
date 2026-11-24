import { describe, expect, it } from "vitest";
import { emptyVariant, type VariantDraft } from "./productDraft";
import { byColor, groupState, groupStatus, optionsWithoutColor, variantGroups, variantProblems } from "./variantGroups";

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
    expect(fresh).toEqual({ variants: [a, c], stock: 5, drafts: 0 });
    expect(used).toEqual({ variants: [b], stock: 1, drafts: 0 });
  });

  // 24/11 : le stock affiché est celui qu'on peut vendre. Une variante en brouillon ne le grossit pas, on la compte à part.
  it("ne compte pas le stock d'une variante en brouillon, et les compte à part", () => {
    const live = variant("new", { stock: "3" });
    const draft = variant("new", { stock: "4", status: "draft" });
    expect(variantGroups([live, draft]).fresh).toEqual({ variants: [live, draft], stock: 3, drafts: 1 });
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
      { color: "Noir", variants: [noir1, noir2], stock: 3, drafts: 0 },
      { color: "Bleu", variants: [bleu], stock: 0, drafts: 0 },
      { color: null, variants: [sans], stock: 1, drafts: 0 },
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

// 24/11 (demande de Mehdi) : le neuf et l'occasion s'ouvrent dans une fenêtre, depuis une tuile qui en dit l'essentiel.
describe("groupStatus", () => {
  it("dit combien de variantes et de stock, avec le mot de chaque état", () => {
    const fresh = variantGroups([variant("new", { stock: "2" }), variant("new", { stock: "3" })]).fresh;
    expect(groupStatus(fresh, "new")).toBe("2 variantes · 5 en stock");
    const used = variantGroups([variant("refurbished", { stock: "1" })]).used;
    expect(groupStatus(used, "used")).toBe("1 variante · 1 appareil");
  });

  it("ajoute les brouillons, au singulier et au pluriel", () => {
    const one = variantGroups([variant("new", { stock: "2" }), variant("new", { status: "draft" })]).fresh;
    expect(groupStatus(one, "new")).toBe("2 variantes · 2 en stock · 1 brouillon");
    const two = variantGroups([variant("refurbished", { status: "draft" }), variant("refurbished", { status: "draft" })]).used;
    expect(groupStatus(two, "used")).toBe("2 variantes · 0 appareil · 2 brouillons");
  });

  it("une liste vide le dit", () => {
    expect(groupStatus(variantGroups([]).used, "used")).toBe("Aucune variante");
  });
});

describe("groupState", () => {
  it("rempli quand tout est prêt, à compléter dès qu'une variante a un manque, facultatif sans variante", () => {
    expect(groupState(variantGroups([variant("new")]).fresh)).toBe("done");
    expect(groupState(variantGroups([variant("new"), variant("new", { price: "" })]).fresh)).toBe("todo");
    expect(groupState(variantGroups([]).used)).toBe("optional");
  });
});
