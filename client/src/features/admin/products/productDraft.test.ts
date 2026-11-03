import { describe, expect, it } from "vitest";
import type { AdminProduct } from "../adminApi";
import {
  bodyFromDraft,
  draftFromProduct,
  emptyDraft,
  emptyVariant,
  missingPartOrigins,
  type VariantDraft,
  withReplacedParts,
} from "./productDraft";

// Une affaire du formulaire : un écran compatible et une batterie d'origine.
const deal = (patch: Partial<VariantDraft> = {}): VariantDraft => ({
  ...emptyVariant("refurbished"),
  sku: "S24U-R-1",
  price: "169000",
  grade: "9",
  batteryHealth: "94",
  replacedParts: ["Écran", "Batterie"],
  partOrigins: { Écran: "compatible", Batterie: "origine" },
  ...patch,
});
const sent = (variant: VariantDraft) => bodyFromDraft({ ...emptyDraft(), variants: [variant] }).variants[0];

describe("missingPartOrigins", () => {
  it("donne les pièces changées d'une affaire sans choix « d'origine » ou « compatible »", () => {
    expect(missingPartOrigins(deal({ partOrigins: { Écran: "compatible" } }))).toEqual(["Batterie"]);
    expect(missingPartOrigins(deal())).toEqual([]);
  });

  it("ne demande rien pour un neuf scellé", () => {
    expect(missingPartOrigins({ ...deal({ partOrigins: {} }), condition: "new" })).toEqual([]);
  });
});

describe("bodyFromDraft", () => {
  it("envoie la boîte, les pièces compatibles et les détails d'une affaire", () => {
    expect(sent(deal({ withBox: true, details: "Comme neuf" }))).toMatchObject({
      withBox: true,
      compatibleParts: ["Écran"],
      details: "Comme neuf",
    });
  });

  it("n'envoie ni boîte, ni pièces compatibles, ni détails pour une affaire repassée en neuf scellé", () => {
    expect(sent({ ...deal({ withBox: true, details: "Comme neuf" }), condition: "new" })).toMatchObject({
      withBox: null,
      compatibleParts: [],
      details: "",
    });
  });
});

describe("withReplacedParts", () => {
  it("retire le choix d'une pièce décochée", () => {
    const next = withReplacedParts(deal(), ["Batterie"]);
    expect(next).toMatchObject({ replacedParts: ["Batterie"], partOrigins: { Batterie: "origine" } });
    expect(sent(next).compatibleParts).toEqual([]);
  });
});

describe("draftFromProduct", () => {
  it("reprend la boîte, l'origine de chaque pièce et les détails", () => {
    const product = {
      name: "Galaxy S24 Ultra",
      description: "Test",
      categoryId: 1,
      deviceModelId: null,
      brandId: null,
      compatibleModels: [],
      specs: {},
      status: "published",
      variants: [
        {
          id: 7,
          sku: "S24U-R-1",
          options: {},
          price: 169000,
          stock: 1,
          condition: "refurbished",
          grade: 9,
          batteryHealth: 94,
          replacedParts: ["Écran", "Batterie"],
          compatibleParts: ["Écran"],
          defects: [],
          limitations: [],
          withBox: true,
          details: null,
          gifts: [],
        },
      ],
    } as unknown as AdminProduct;
    expect(draftFromProduct(product).variants[0]).toMatchObject({
      withBox: true,
      partOrigins: { Écran: "compatible", Batterie: "origine" },
      details: "",
    });
  });
});
