import { describe, expect, it } from "vitest";
import { brandSlugFromPath, homeCategories, isBrowseSwitch, pickBrand } from "./tiles";

// L'accueil (refonte du 11/11 au soir) : des cartes identiques dans un carrousel. Le carrousel
// montre toutes les catégories qui ont des produits : plus de plafond, plus de grille à remplir.
describe("homeCategories", () => {
  const category = (name: string, productCount: number, featured = false) => ({ name, productCount, featured });
  const names = (list: { name: string }[]) => list.map((item) => item.name);

  it("cache les catégories sans produit publié (Accessoires à 0)", () => {
    expect(names(homeCategories([category("Smartphones", 48), category("Accessoires", 0), category("PC", 127, true)]))).toEqual([
      "PC",
      "Smartphones",
    ]);
  });

  it("met la catégorie mise en avant en premier, les autres gardent l'ordre de l'API", () => {
    expect(names(homeCategories([category("A", 1), category("B", 1), category("C", 1, true), category("D", 1)]))).toEqual([
      "C",
      "A",
      "B",
      "D",
    ]);
  });

  it("les garde toutes, même nombreuses", () => {
    expect(homeCategories(Array.from({ length: 9 }, (_, i) => category(`C${i}`, 5)))).toHaveLength(9);
  });

  it("n'a rien à montrer sans catégorie", () => {
    expect(homeCategories([])).toEqual([]);
  });
});

// Passer d'une marque à une autre, ou de la catégorie à une de ses marques, ne change pas de page
// (refonte du 12/11) : la transition de page ne doit pas jouer.
describe("isBrowseSwitch", () => {
  it("reconnaît le passage d'une marque à une autre dans la même catégorie", () => {
    expect(isBrowseSwitch("/boutique/smartphones/iphone", "/boutique/smartphones/samsung")).toBe(true);
  });

  it("reconnaît le passage de la catégorie à une de ses marques, et le retour", () => {
    expect(isBrowseSwitch("/boutique/smartphones", "/boutique/smartphones/samsung")).toBe(true);
    expect(isBrowseSwitch("/boutique/smartphones/samsung", "/boutique/smartphones")).toBe(true);
  });

  it("ne dit rien vers une autre catégorie, une série, un produit ou l'accueil", () => {
    expect(isBrowseSwitch("/boutique/smartphones", "/boutique/tablettes")).toBe(false);
    expect(isBrowseSwitch("/boutique/smartphones/iphone", "/boutique/smartphones/iphone/iphone-17")).toBe(false);
    expect(isBrowseSwitch("/boutique/smartphones", "/produits/iphone-17")).toBe(false);
    expect(isBrowseSwitch("/", "/boutique/smartphones")).toBe(false);
  });
});

describe("brandSlugFromPath", () => {
  it("lit la marque d'une page de la catégorie", () => {
    expect(brandSlugFromPath("/boutique/smartphones/samsung", "smartphones")).toBe("samsung");
  });

  it("rend null sans marque, ou pour une autre catégorie", () => {
    expect(brandSlugFromPath("/boutique/smartphones", "smartphones")).toBeNull();
    expect(brandSlugFromPath("/boutique/tablettes/samsung", "smartphones")).toBeNull();
    expect(brandSlugFromPath("/boutique/smartphones/iphone/iphone-17", "smartphones")).toBeNull();
    expect(brandSlugFromPath(null, "smartphones")).toBeNull();
  });
});

describe("pickBrand", () => {
  const groups = [{ brand: { slug: "iphone" } }, { brand: { slug: "samsung" } }];

  it("rend le groupe demandé", () => {
    expect(pickBrand(groups, "samsung")).toBe(groups[1]);
  });

  it("rend le premier sans marque, ou pour une marque absente (épuisée, inconnue)", () => {
    expect(pickBrand(groups, null)).toBe(groups[0]);
    expect(pickBrand(groups, "gigabyte")).toBe(groups[0]);
    expect(pickBrand([], "iphone")).toBeUndefined();
  });
});
