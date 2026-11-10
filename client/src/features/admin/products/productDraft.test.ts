import { describe, expect, it } from "vitest";
import type { AdminProduct } from "../adminApi";
import {
  bodyFromDraft,
  draftFromProduct,
  emptyDraft,
  emptyVariant,
  fillMissingWarranties,
  invalidWarranty,
  missingBox,
  missingPartOrigins,
  unitDraft,
  variantBody,
  type VariantDraft,
  withCondition,
  withReplacedParts,
} from "./productDraft";

// « Créer la fiche » depuis le Catalogue : la catégorie est déjà choisie, mais sa sorte
// n'est connue qu'une fois les catégories chargées (relecture du 04/11).
describe("fillMissingWarranties", () => {
  it("remplit la garantie vide des variantes d'une fiche préremplie, selon leur état", () => {
    const draft = emptyDraft({ categoryId: 1, brandId: 2, deviceModelId: 3, name: "iPhone 18 Pro" });
    const filled = fillMissingWarranties(
      { ...draft, variants: [...draft.variants, emptyVariant("refurbished")] },
      "phone",
    );
    expect(filled.variants.map((variant) => variant.warrantyMonths)).toEqual(["12", "6"]);
  });

  it("ne touche pas une garantie déjà tapée, ni un accessoire", () => {
    const draft = { ...emptyDraft(), variants: [{ ...emptyVariant(), warrantyMonths: "24" }] };
    expect(fillMissingWarranties(draft, "phone").variants[0].warrantyMonths).toBe("24");
    expect(fillMissingWarranties(emptyDraft(), "accessory").variants[0].warrantyMonths).toBe("");
  });
});

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

  it("permet de saisir plusieurs unités pour une même affaire", () => {
    const changed = withCondition({ ...emptyVariant("new", "phone"), stock: "4" }, "phone", "refurbished");
    expect(changed.stock).toBe("4");
    expect(sent(deal({ stock: "4" })).stock).toBe(4);
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

// Le champ acceptait 0 à 99 alors que l'API veut 1 à 36 : un « 48 » n'était refusé qu'à
// l'envoi, par un message de l'API (décision de Mehdi du 04/11 : 1 à 36 partout).
describe("invalidWarranty : la garantie de 1 à 36 mois, comme l'API", () => {
  const withWarranty = (warrantyMonths: string) => ({ ...emptyVariant(), warrantyMonths });

  it("refuse 0 et plus de 36 mois", () => {
    expect(["0", "00", "37", "99"].map((months) => invalidWarranty(withWarranty(months)))).toEqual([true, true, true, true]);
  });

  it("accepte 1 à 36 mois, et un champ vide (un accessoire n'en annonce pas)", () => {
    expect(["1", "6", "36", ""].map((months) => invalidWarranty(withWarranty(months)))).toEqual([false, false, false, false]);
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

// L'étape Couleur (05/11) : un exemplaire ajouté depuis la page d'une couleur.
describe("unitDraft", () => {
  it("pose la couleur et la garantie d'un neuf scellé", () => {
    const draft = unitDraft("phone", "new", "Glacier");
    expect(draft.options).toEqual({ Couleur: "Glacier" });
    expect(draft).toMatchObject({ condition: "new", warrantyMonths: "12", stock: "" });
  });

  it("prépare une affaire unique avec sa garantie", () => {
    expect(unitDraft("phone", "refurbished", "Glacier")).toMatchObject({
      condition: "refurbished",
      stock: "1",
      warrantyMonths: "6",
      options: { Couleur: "Glacier" },
    });
  });
});

describe("variantBody", () => {
  it("convertit une variante comme le formulaire produit", () => {
    const draft = { ...unitDraft("phone", "new", "Glacier"), sku: "IP18P-256", price: "280000", stock: "2" };
    draft.options = { ...draft.options, Stockage: "256 Go" };
    expect(variantBody(draft)).toMatchObject({
      sku: "IP18P-256",
      options: { Couleur: "Glacier", Stockage: "256 Go" },
      price: 280000,
      stock: 2,
      warrantyMonths: 12,
      withBox: null,
    });
  });
});
