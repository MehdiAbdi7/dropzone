import { describe, expect, it } from "vitest";
import type { AccessoryCatalog, AccessoryItem, BrandSeries } from "@/types/api";
import { accessoryMakerOptions, accessoryTypeOptions, deviceBrandOptions } from "./filterOptions";

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

describe("accessoryTypeOptions", () => {
  it("met « Tous les types » en premier, puis chaque type avec son nombre de produits", () => {
    expect(accessoryTypeOptions(catalog)).toEqual([
      { value: null, label: "Tous les types", detail: "4", logoUrl: null },
      { value: "chargeurs", label: "Chargeurs", detail: "2", logoUrl: null },
      { value: "cables", label: "Câbles", detail: "1", logoUrl: null },
      { value: "incassable-ecran", label: "Incassable Écran", detail: "1", logoUrl: null },
    ]);
  });
});

describe("accessoryMakerOptions", () => {
  it("liste les marques du type choisi, avec le nombre de produits de chacune", () => {
    expect(accessoryMakerOptions(catalog, "chargeurs")).toEqual([
      { value: null, label: "Toutes les marques", detail: "2", logoUrl: null },
      { value: "anker", label: "Anker", detail: "1", logoUrl: null },
      { value: "apple", label: "Apple", detail: "1", logoUrl: null },
    ]);
  });

  it("ne renvoie rien pour un type sans marque (le bouton disparaît)", () => {
    expect(accessoryMakerOptions(catalog, "incassable-ecran")).toEqual([]);
  });

  it("ne renvoie rien sur « Tous les types »", () => {
    expect(accessoryMakerOptions(catalog, null)).toEqual([]);
  });
});

const brand = (name: string, slug: string, seriesCount: number, logoUrl: string | null = null): BrandSeries => ({
  brand: { name, slug, logoUrl },
  series: Array.from({ length: seriesCount }, (_, i) => ({
    name: `Série ${i}`,
    slug: `serie-${i}`,
    coverUrl: null,
  })) as BrandSeries["series"],
});

describe("deviceBrandOptions", () => {
  const groups = [brand("Apple", "apple", 3, "/brands/apple.svg"), brand("Honor", "honor", 1)];

  it("liste les marques avec leur nombre de séries et leur logo", () => {
    expect(deviceBrandOptions(groups, 0)).toEqual([
      { value: "apple", label: "Apple", detail: "3 séries", logoUrl: "/brands/apple.svg" },
      { value: "honor", label: "Honor", detail: "1 série", logoUrl: null },
    ]);
  });

  it("ajoute « Autres » en dernier quand des produits n'ont pas de marque", () => {
    const options = deviceBrandOptions(groups, 5);
    expect(options.at(-1)).toEqual({ value: "autres", label: "Autres", detail: "5 modèles", logoUrl: null });
    expect(options).toHaveLength(3);
  });

  it("met « modèle » au singulier pour un seul produit sans marque", () => {
    expect(deviceBrandOptions(groups, 1).at(-1)?.detail).toBe("1 modèle");
  });
});
