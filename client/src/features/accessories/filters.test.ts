import { describe, expect, it } from "vitest";
import type { AccessoryCatalog, AccessoryItem } from "@/types/api";
import { accessoryHint, filtersHref, makersOf, readFilters, visibleProducts } from "./filters";

const item = (over: Partial<AccessoryItem>): AccessoryItem => ({
  name: "Produit",
  slug: "produit",
  image: null,
  type: "chargeurs",
  maker: null,
  minPrice: 1000,
  hasRange: false,
  inStock: true,
  options: {},
  ...over,
});

const catalog: AccessoryCatalog = {
  category: { name: "Accessoires", slug: "accessoires" },
  types: [
    { name: "Chargeurs", slug: "chargeurs", makers: [{ name: "Anker", slug: "anker", logoUrl: null }, { name: "Apple", slug: "apple", logoUrl: null }] },
    { name: "Câbles", slug: "cables", makers: [{ name: "Anker", slug: "anker", logoUrl: null }] },
    { name: "Incassable Écran", slug: "incassable-ecran", makers: [] },
  ],
  products: [
    item({ name: "Bloc Anker", type: "chargeurs", maker: { name: "Anker", slug: "anker" } }),
    item({ name: "Bloc Apple", type: "chargeurs", maker: { name: "Apple", slug: "apple" } }),
    item({ name: "Câble Anker", type: "cables", maker: { name: "Anker", slug: "anker" } }),
    item({ name: "Verre Standard", type: "incassable-ecran" }),
  ],
};

const params = (query: string) => new URLSearchParams(query);

describe("readFilters", () => {
  it("lit le type et la marque de l'adresse", () => {
    expect(readFilters(params("type=chargeurs&marque=anker"), catalog)).toEqual({ type: "chargeurs", maker: "anker" });
  });

  it("ramène à Tous un type inconnu, et oublie sa marque", () => {
    expect(readFilters(params("type=montres&marque=anker"), catalog)).toEqual({ type: null, maker: null });
  });

  it("ramène à Toutes une marque que le type n'a pas", () => {
    expect(readFilters(params("type=cables&marque=xiaomi"), catalog)).toEqual({ type: "cables", maker: null });
  });

  it("oublie une marque sans type", () => {
    expect(readFilters(params("marque=anker"), catalog)).toEqual({ type: null, maker: null });
  });
});

describe("filtersHref", () => {
  it("écrit le type et la marque", () => {
    expect(filtersHref("accessoires", { type: "coques", maker: "samsung" })).toBe("/boutique/accessoires?type=coques&marque=samsung");
  });

  it("écrit seulement le type", () => {
    expect(filtersHref("accessoires", { type: "coques", maker: null })).toBe("/boutique/accessoires?type=coques");
  });

  it("n'écrit pas de ? sans filtre", () => {
    expect(filtersHref("accessoires", { type: null, maker: null })).toBe("/boutique/accessoires");
  });
});

describe("visibleProducts", () => {
  it("rend tout sans filtre", () => {
    expect(visibleProducts(catalog, { type: null, maker: null })).toHaveLength(4);
  });

  it("filtre par type, puis par marque", () => {
    expect(visibleProducts(catalog, { type: "chargeurs", maker: null }).map((p) => p.name)).toEqual(["Bloc Anker", "Bloc Apple"]);
    expect(visibleProducts(catalog, { type: "chargeurs", maker: "apple" }).map((p) => p.name)).toEqual(["Bloc Apple"]);
  });
});

describe("makersOf", () => {
  it("rend les marques du type", () => {
    expect(makersOf(catalog, "chargeurs").map((m) => m.slug)).toEqual(["anker", "apple"]);
  });

  it("rend une liste vide pour Tous ou un type sans marque", () => {
    expect(makersOf(catalog, null)).toEqual([]);
    expect(makersOf(catalog, "incassable-ecran")).toEqual([]);
  });
});

describe("accessoryHint", () => {
  it("compte les tailles d'écran", () => {
    const sizes = ["4,7 pouces", "5,4 pouces", "5,5 pouces", "5,8 pouces", "6,1 pouces", "6,2 pouces", "6,3 pouces", "6,4 pouces", "6,5 pouces", "6,6 pouces", "6,7 pouces", "6,8 pouces", "6,9 pouces"];
    expect(accessoryHint(item({ options: { "Taille de l'écran": sizes } }))).toBe("13 tailles d'écran");
  });

  it("compte les modèles", () => {
    expect(accessoryHint(item({ options: { Modèle: ["iPhone 15", "iPhone 16"], Couleur: ["Noir", "Bleu"] } }))).toBe("2 modèles");
  });

  it("donne deux valeurs avec « ou »", () => {
    expect(accessoryHint(item({ options: { Puissance: ["25 W", "45 W"] } }))).toBe("25 ou 45 W");
  });

  it("donne plus de deux valeurs de la première à la dernière", () => {
    expect(accessoryHint(item({ options: { Puissance: ["20 W", "30 W", "45 W", "65 W", "100 W"] } }))).toBe("De 20 à 100 W");
  });

  it("nomme les options quand il y en a plusieurs", () => {
    expect(accessoryHint(item({ options: { Câble: ["Lightning", "USB-C"], Puissance: ["20 W", "30 W"] } }))).toBe("Câble et puissance au choix");
  });

  it("écrit la seule valeur, ou rien", () => {
    expect(accessoryHint(item({ options: { Longueur: ["1 m"] } }))).toBe("1 m");
    expect(accessoryHint(item({ options: {} }))).toBe("");
  });
});
