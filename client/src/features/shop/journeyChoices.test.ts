import { describe, expect, it } from "vitest";
import type { BrandSeries, Category, PosterModel, ProductDetail, SeriesPoster, Variant } from "@/types/api";
import {
  brandChoices,
  categoryChoices,
  colorChoices,
  conditionChoices,
  modelChoices,
  seriesChoices,
} from "./journeyChoices";

const category = (name: string, slug: string) => ({ name, slug }) as Category;

describe("categoryChoices", () => {
  const categories = [category("Smartphones", "smartphones"), category("Tablettes", "tablettes"), category("Accessoires", "accessoires")];

  it("liste les catégories vers leur page, la courante cochée, sans détail", () => {
    expect(categoryChoices(categories, "tablettes")).toEqual([
      { label: "Smartphones", detail: "", href: "/boutique/smartphones", selected: false },
      { label: "Tablettes", detail: "", href: "/boutique/tablettes", selected: true },
      { label: "Accessoires", detail: "", href: "/boutique/accessoires", selected: false },
    ]);
  });
});

const series = (name: string, slug: string, modelCount: number) => ({
  name,
  slug,
  models: Array.from({ length: modelCount }, (_, i) => `Modèle ${i}`),
});
const group = (name: string, slug: string, list: ReturnType<typeof series>[]) =>
  ({ brand: { name, slug, logoUrl: null }, series: list }) as unknown as BrandSeries;

const groups = [
  group("Apple", "apple", [series("iPhone 17", "iphone-17", 4), series("iPhone 16", "iphone-16", 3), series("iPhone 15", "iphone-15", 2)]),
  group("Honor", "honor", [series("Honor 200", "honor-200", 1)]),
  group("Huawei", "huawei", [series("Huawei P30", "huawei-p30", 1), series("Huawei P60", "huawei-p60", 2)]),
];

describe("brandChoices", () => {
  it("liste les marques avec leur nombre de séries, la courante cochée", () => {
    expect(brandChoices(groups, "smartphones", "honor")).toEqual([
      { label: "Apple", detail: "3 séries", href: "/boutique/smartphones/apple", selected: false },
      { label: "Honor", detail: "1 série", href: "/boutique/smartphones/honor", selected: true },
      { label: "Huawei", detail: "2 séries", href: "/boutique/smartphones/huawei", selected: false },
    ]);
  });

  it("ne coche rien quand la marque courante est inconnue (« Autres »)", () => {
    expect(brandChoices(groups, "smartphones", null).some((choice) => choice.selected)).toBe(false);
  });
});

describe("seriesChoices", () => {
  it("liste les séries de la marque avec leur nombre de modèles", () => {
    expect(seriesChoices(groups, "smartphones", "huawei", "huawei-p30")).toEqual([
      { label: "Huawei P30", detail: "1 modèle", href: "/boutique/smartphones/huawei/huawei-p30", selected: true },
      { label: "Huawei P60", detail: "2 modèles", href: "/boutique/smartphones/huawei/huawei-p60", selected: false },
    ]);
  });

  it("renvoie une liste vide pour une marque inconnue", () => {
    expect(seriesChoices(groups, "smartphones", "xiaomi", null)).toEqual([]);
  });
});

const poster = (models: Partial<PosterModel>[]) =>
  ({
    name: "Huawei P30",
    slug: "huawei-p30",
    category: { name: "Smartphones", slug: "smartphones" },
    brand: { name: "Huawei", slug: "huawei" },
    models: models.map((model) => ({ name: "Modèle", productSlug: null, colors: [], ...model })),
  }) as unknown as SeriesPoster;

describe("modelChoices", () => {
  it("laisse de côté un modèle sans fiche publiée", () => {
    const list = modelChoices(poster([{ name: "P30", productSlug: "p30" }, { name: "P30 Pro", productSlug: null }]), null);
    expect(list.map((choice) => choice.label)).toEqual(["P30"]);
  });

  it("coche le modèle courant et donne le nombre de coloris", () => {
    const list = modelChoices(
      poster([
        { name: "P30", productSlug: "p30", colors: ["Noir", "Bleu", "Rose"] },
        { name: "P30 Pro", productSlug: "p30-pro", colors: [] },
      ]),
      "p30",
    );
    expect(list).toEqual([
      { label: "P30", detail: "3 coloris", href: "/produits/p30", selected: true },
      { label: "P30 Pro", detail: "", href: "/produits/p30-pro", selected: false },
    ]);
  });
});

const variant = (condition: Variant["condition"], color: string, stock: number): Variant =>
  ({ sku: `${condition}-${color}`, options: { Couleur: color }, price: 1000, stock, condition }) as unknown as Variant;

const product = (variants: Variant[]) =>
  ({
    slug: "p30-pro",
    variants,
    colors: [
      { name: "Noir", photoUrl: null },
      { name: "Bleu", photoUrl: null },
    ],
  }) as unknown as ProductDetail;

describe("conditionChoices", () => {
  it("ne propose que les états qui ont du stock", () => {
    const list = conditionChoices(product([variant("new", "Noir", 2), variant("refurbished", "Noir", 0)]), null);
    expect(list).toEqual([{ label: "Neuf scellé", detail: "", href: "/produits/p30-pro/neuf", selected: false }]);
  });

  it("met le neuf avant l'occasion et coche l'état courant", () => {
    const list = conditionChoices(product([variant("refurbished", "Noir", 1), variant("new", "Noir", 1)]), "refurbished");
    expect(list.map((choice) => [choice.label, choice.selected])).toEqual([
      ["Neuf scellé", false],
      ["Occasion", true],
    ]);
    expect(list[1].href).toBe("/produits/p30-pro/occasion");
  });
});

describe("colorChoices", () => {
  it("laisse de côté une couleur sans stock dans l'état demandé", () => {
    const list = colorChoices(product([variant("new", "Noir", 3), variant("new", "Bleu", 0)]), "new", null);
    expect(list.map((choice) => choice.label)).toEqual(["Noir"]);
  });

  it("mène à la couleur de l'état, la courante cochée", () => {
    const list = colorChoices(product([variant("new", "Noir", 3), variant("new", "Bleu", 1)]), "new", "Noir");
    expect(list).toEqual([
      { label: "Noir", detail: "", href: "/produits/p30-pro/neuf?couleur=Noir", selected: true },
      { label: "Bleu", detail: "", href: "/produits/p30-pro/neuf?couleur=Bleu", selected: false },
    ]);
  });
});
