import { describe, expect, it } from "vitest";
import { categorySlugFromPath, defaultCategory, homeCategories, isCategorySwitch } from "./tiles";

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

// `/boutique` ouvre directement une catégorie : celle qui a le plus de produits publiés.
describe("defaultCategory", () => {
  const category = (name: string, productCount: number) => ({ name, productCount });

  it("choisit la catégorie la plus fournie, comme les PC portables", () => {
    const picked = defaultCategory([category("Smartphones", 48), category("PC", 127), category("Tablettes", 7)]);
    expect(picked?.name).toBe("PC");
  });

  it("ignore les catégories vides, même seules en tête de liste", () => {
    expect(defaultCategory([category("Accessoires", 0), category("Tablettes", 7)])?.name).toBe("Tablettes");
  });

  it("garde la première de l'API à égalité", () => {
    expect(defaultCategory([category("A", 5), category("B", 5)])?.name).toBe("A");
  });

  it("n'en choisit aucune quand toutes sont vides", () => {
    expect(defaultCategory([category("A", 0)])).toBeUndefined();
    expect(defaultCategory([])).toBeUndefined();
  });
});

// La Boutique change de catégorie sur place et met l'adresse à jour : la catégorie affichée se
// relit dans l'adresse, pour que le bouton « précédent » du navigateur fonctionne.
describe("categorySlugFromPath", () => {
  it("lit la catégorie dans /boutique/<catégorie>", () => {
    expect(categorySlugFromPath("/boutique/tablettes")).toBe("tablettes");
    expect(categorySlugFromPath("/boutique/ordinateurs-portables")).toBe("ordinateurs-portables");
  });

  it("accepte une barre finale", () => {
    expect(categorySlugFromPath("/boutique/tablettes/")).toBe("tablettes");
  });

  it("ne lit rien hors d'une page de catégorie", () => {
    expect(categorySlugFromPath("/boutique")).toBeNull();
    expect(categorySlugFromPath("/produits")).toBeNull();
    expect(categorySlugFromPath("/")).toBeNull();
    expect(categorySlugFromPath(null)).toBeNull();
  });

  it("ne confond pas une page de marque avec une catégorie", () => {
    expect(categorySlugFromPath("/boutique/smartphones/iphone")).toBeNull();
  });
});

// Passer d'une catégorie à une autre ne change pas de page : seules les marques changent. La
// transition de page ne doit donc pas jouer.
describe("isCategorySwitch", () => {
  it("reconnaît le passage d'une catégorie à une autre", () => {
    expect(isCategorySwitch("/boutique/smartphones", "/boutique/tablettes")).toBe(true);
  });

  it("ne dit rien d'une page de catégorie vers une page de marque, un produit ou l'accueil", () => {
    expect(isCategorySwitch("/boutique/smartphones", "/boutique/smartphones/iphone")).toBe(false);
    expect(isCategorySwitch("/boutique/smartphones", "/produits/iphone-17")).toBe(false);
    expect(isCategorySwitch("/boutique/smartphones", "/")).toBe(false);
  });

  it("ne dit rien quand on arrive sur la catégorie depuis une autre sorte de page", () => {
    expect(isCategorySwitch("/", "/boutique/smartphones")).toBe(false);
    expect(isCategorySwitch("/boutique/smartphones/iphone", "/boutique/tablettes")).toBe(false);
  });
});
