import { describe, expect, it } from "vitest";
import type { AdminProduct } from "../adminApi";
import {
  bodyFromDraft,
  draftFromProduct,
  emptyDraft,
  emptyVariant,
  missingBox,
  missingPartOrigins,
  type VariantDraft,
  withCondition,
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

describe("La garantie proposée par le formulaire", () => {
  it("met celle de DropZone selon le type et l'état", () => {
    expect(emptyVariant("refurbished", "phone").warrantyMonths).toBe("6");
    expect(emptyVariant("new", "tablet").warrantyMonths).toBe("12");
    expect(emptyVariant("new", "laptop").warrantyMonths).toBe("3");
    expect(emptyVariant("new", "accessory").warrantyMonths).toBe("");
    expect(emptyVariant().warrantyMonths).toBe("");
  });

  it("suit l'état quand le gérant passe de Neuf scellé à Affaire", () => {
    const changed = withCondition(emptyVariant("new", "phone"), "phone", "refurbished");
    expect(changed).toMatchObject({ condition: "refurbished", stock: "1", warrantyMonths: "6" });
  });

  it("garde une garantie tapée à la main", () => {
    const typed = { ...emptyVariant("new", "phone"), warrantyMonths: "24" };
    expect(withCondition(typed, "phone", "refurbished").warrantyMonths).toBe("24");
  });

  it("envoie la garantie en nombre, et null pour un champ vide", () => {
    expect(sent(deal({ warrantyMonths: "6" })).warrantyMonths).toBe(6);
    expect(sent(deal({ warrantyMonths: "" })).warrantyMonths).toBeNull();
  });
});

describe("Origine et référence", () => {
  it("les envoie telles quelles (l'API range un champ vide comme absent)", () => {
    expect(sent(deal({ origin: "Europe", reference: "51057" }))).toMatchObject({ origin: "Europe", reference: "51057" });
    expect(sent(deal({ origin: "", reference: "" }))).toMatchObject({ origin: "", reference: "" });
  });
});

describe("missingBox : la boîte d'une affaire importée, à corriger", () => {
  const imported = (condition: "new" | "refurbished") =>
    draftFromProduct({
      name: "Dell Latitude 5440",
      description: "Test",
      categoryId: 1,
      deviceModelId: null,
      brandId: null,
      compatibleModels: [],
      specs: {},
      status: "published",
      variants: [
        {
          id: 8,
          sku: "IG-0123456789",
          options: {},
          price: 109000,
          stock: 1,
          condition,
          grade: null,
          batteryHealth: null,
          replacedParts: [],
          compatibleParts: [],
          defects: [],
          limitations: [],
          withBox: null,
          details: null,
          warrantyMonths: 3,
          origin: "Europe",
          reference: "41240",
          gifts: [],
        },
      ],
    } as unknown as AdminProduct).variants[0];

  it("signale une affaire dont l'annonce ne disait rien de la boîte", () => {
    const variant = imported("refurbished");
    expect(variant).toMatchObject({ withBox: null, warrantyMonths: "3", origin: "Europe", reference: "41240" });
    expect(missingBox(variant)).toBe(true);
  });

  it("ne demande rien pour un neuf scellé, ni pour une affaire dont la boîte est choisie", () => {
    expect(missingBox(imported("new"))).toBe(false);
    expect(missingBox(deal({ withBox: false }))).toBe(false);
  });
});

describe("emptyDraft prérempli depuis le Catalogue", () => {
  it("met la catégorie, la marque, le modèle et son nom", () => {
    const draft = emptyDraft({ categoryId: 1, brandId: 2, deviceModelId: 3, name: "iPhone 18 Pro" });
    expect(draft).toMatchObject({ categoryId: 1, brandId: 2, deviceModelId: 3, name: "iPhone 18 Pro", status: "draft" });
    expect(draft.variants).toHaveLength(1);
  });

  it("reste vide sans préremplissage", () => {
    expect(emptyDraft()).toMatchObject({ categoryId: null, brandId: null, deviceModelId: null, name: "" });
  });
});
