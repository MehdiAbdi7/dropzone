import { describe, expect, it } from "vitest";
import type { ProductDetail, SeriesPoster } from "@/types/api";
import {
  type JourneyInput,
  journeyBackHref,
  journeyProgress,
  journeySteps,
  journeyTitle,
  productJourney,
  seriesJourney,
} from "./journey";

// Un Huawei P30 Pro : catégorie smartphones, marque Huawei, série Huawei P30, avec des couleurs.
const base: JourneyInput = {
  category: { name: "Smartphones", slug: "smartphones" },
  brand: { name: "Huawei", slug: "huawei" },
  series: { name: "Huawei P30", slug: "huawei-p30" },
  model: { name: "P30 Pro", slug: "p30-pro" },
  hasColors: true,
  condition: null,
  color: null,
  current: "model",
};

const keys = (input: JourneyInput) => journeySteps(input).map((step) => step.key);

describe("journeySteps", () => {
  it("sur la page de la série : trois étapes faites, le modèle en cours, deux à venir", () => {
    const steps = journeySteps({ ...base, model: null });
    expect(steps.map((step) => step.label)).toEqual(["Catégorie", "Marque", "Série", "Modèle", "État", "Couleur"]);
    expect(steps.map((step) => step.status)).toEqual(["done", "done", "done", "current", "todo", "todo"]);
    expect(steps.map((step) => step.value)).toEqual(["Smartphones", "Huawei", "Huawei P30", "À choisir", null, null]);
  });

  it("donne à chaque étape l'adresse de la page où ce choix se fait", () => {
    const steps = journeySteps({ ...base, condition: "new", color: null });
    expect(steps.map((step) => step.href)).toEqual([
      "/boutique",
      "/boutique/smartphones",
      "/boutique/smartphones/huawei",
      "/boutique/smartphones/huawei/huawei-p30",
      "/produits/p30-pro",
      "/produits/p30-pro/neuf",
    ]);
  });

  it("n'a pas d'adresse pour l'état et la couleur tant que le modèle ou l'état est inconnu", () => {
    const steps = journeySteps({ ...base, model: null, condition: null });
    expect(steps[4].href).toBeNull();
    expect(steps[5].href).toBeNull();
    const withModel = journeySteps({ ...base, condition: null });
    expect(withModel[4].href).toBe("/produits/p30-pro");
    expect(withModel[5].href).toBeNull();
  });

  it("sur la fiche finale : les six étapes sont faites, avec l'état et la couleur choisis", () => {
    const steps = journeySteps({ ...base, condition: "refurbished", color: "Noir", current: "end" });
    expect(steps.every((step) => step.status === "done")).toBe(true);
    expect(steps.map((step) => step.value)).toEqual(["Smartphones", "Huawei", "Huawei P30", "P30 Pro", "Occasion", "Noir"]);
    expect(steps[5].href).toBe("/produits/p30-pro/occasion");
  });

  it("page de référence (couleurs vues avant le choix de l'état) : l'état est « Au choix »", () => {
    const steps = journeySteps({ ...base, current: "color", condition: null });
    expect(steps.map((step) => step.status)).toEqual(["done", "done", "done", "done", "done", "current"]);
    expect(steps[4].value).toBe("Au choix");
    // Le retour mène toujours au choix de l'état.
    expect(journeyBackHref(steps)).toBe("/produits/p30-pro");
  });

  it("saute l'étape Série d'un produit sans série", () => {
    expect(keys({ ...base, series: null })).toEqual(["category", "brand", "model", "condition", "color"]);
  });

  it("range un produit sans marque dans « Autres »", () => {
    const steps = journeySteps({ ...base, brand: null, series: null });
    expect(steps[1].value).toBe("Autres");
    expect(steps[2].href).toBe("/boutique/smartphones/autres");
  });

  it("saute l'étape Couleur d'un modèle sans couleurs", () => {
    expect(keys({ ...base, hasColors: false })).toEqual(["category", "brand", "series", "model", "condition"]);
  });
});

describe("journeyProgress", () => {
  it("compte l'étape en cours sur le total réel", () => {
    expect(journeyProgress(journeySteps({ ...base, model: null }))).toEqual({ position: 4, total: 6, kicker: "ÉTAPE 4 SUR 6" });
  });

  it("compte sur cinq quand il n'y a pas de série", () => {
    const steps = journeySteps({ ...base, model: null, series: null });
    expect(journeyProgress(steps)).toEqual({ position: 3, total: 5, kicker: "ÉTAPE 3 SUR 5" });
  });

  it("dit que tout est choisi sur la fiche finale", () => {
    const steps = journeySteps({ ...base, condition: "new", color: "Noir", current: "end" });
    expect(journeyProgress(steps)).toEqual({ position: null, total: 6, kicker: "TOUT EST CHOISI" });
  });
});

describe("journeyBackHref", () => {
  it("de la page de la série, remonte à la page de la marque (où la série se choisit)", () => {
    expect(journeyBackHref(journeySteps({ ...base, model: null }))).toBe("/boutique/smartphones/huawei");
  });

  it("du choix de l'état, remonte à la page de la série", () => {
    expect(journeyBackHref(journeySteps({ ...base, current: "condition" }))).toBe("/boutique/smartphones/huawei/huawei-p30");
  });

  it("du choix de la couleur, remonte au choix de l'état", () => {
    expect(journeyBackHref(journeySteps({ ...base, current: "color", condition: "new" }))).toBe("/produits/p30-pro");
  });

  it("de la fiche finale, remonte au choix de la couleur", () => {
    expect(journeyBackHref(journeySteps({ ...base, current: "end", condition: "new", color: "Noir" }))).toBe("/produits/p30-pro/neuf");
  });

  it("n'a pas de retour quand l'étape en cours est la première", () => {
    expect(journeyBackHref(journeySteps({ ...base, current: "category" }))).toBeNull();
  });
});

describe("journeyTitle", () => {
  it("dit ce qu'il faut faire à chaque étape", () => {
    expect(journeyTitle("category")).toBe("Choisis ta catégorie");
    expect(journeyTitle("brand")).toBe("Choisis ta marque");
    expect(journeyTitle("series")).toBe("Choisis ta série");
    expect(journeyTitle("model")).toBe("Choisis ton modèle");
    expect(journeyTitle("condition")).toBe("Neuf scellé ou occasion ?");
    expect(journeyTitle("color")).toBe("Choisis la couleur");
    expect(journeyTitle("end")).toBe("Prêt à commander");
  });
});

const product = (over: Partial<ProductDetail>): ProductDetail =>
  ({
    name: "P30 Pro",
    slug: "p30-pro",
    category: { name: "Smartphones", slug: "smartphones", kind: "phone" },
    brand: { name: "Huawei", slug: "huawei" },
    series: { name: "Huawei P30", slug: "huawei-p30" },
    colors: [{ name: "Noir", photoUrl: null }],
    ...over,
  }) as ProductDetail;

describe("productJourney", () => {
  it("reprend la catégorie, la marque, la série et le modèle du produit", () => {
    expect(productJourney(product({}), "condition", null, null)).toEqual({
      category: { name: "Smartphones", slug: "smartphones" },
      brand: { name: "Huawei", slug: "huawei" },
      series: { name: "Huawei P30", slug: "huawei-p30" },
      model: { name: "P30 Pro", slug: "p30-pro" },
      hasColors: true,
      condition: null,
      color: null,
      current: "condition",
    });
  });

  it("n'a ni série ni couleurs quand le produit n'en a pas", () => {
    const input = productJourney(product({ series: null, colors: [] }), "end", "new", null);
    expect(input.series).toBeNull();
    expect(input.hasColors).toBe(false);
    expect(input.condition).toBe("new");
  });
});

describe("seriesJourney", () => {
  it("met l'étape Modèle en cours, sans modèle choisi, avec les couleurs à venir", () => {
    const poster = {
      name: "Huawei P30",
      slug: "huawei-p30",
      category: { name: "Smartphones", slug: "smartphones" },
      brand: { name: "Huawei", slug: "huawei" },
      models: [],
    } as SeriesPoster;
    expect(seriesJourney(poster)).toEqual({
      category: { name: "Smartphones", slug: "smartphones" },
      brand: { name: "Huawei", slug: "huawei" },
      series: { name: "Huawei P30", slug: "huawei-p30" },
      model: null,
      hasColors: true,
      condition: null,
      color: null,
      current: "model",
    });
  });
});
