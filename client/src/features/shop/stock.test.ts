import { describe, expect, it } from "vitest";
import type { Options, Variant } from "@/types/api";
import {
  conditionSummary,
  initialSelection,
  optionChoices,
  optionKeys,
  requestedSelection,
  selectOption,
  withOriginOption,
} from "./stock";

const variant = (
  options: Options,
  stock: number,
  price = 335000,
  condition: Variant["condition"] = "new",
): Variant => ({
  sku: `${options.Couleur ?? "X"}-${options.Stockage ?? "X"}-${price}-${condition}`,
  options,
  price,
  stock,
  condition,
  grade: condition === "new" ? null : 9,
  batteryHealth: condition === "new" ? null : 95,
  replacedParts: [],
  compatibleParts: [],
  defects: [],
  limitations: [],
  withBox: condition === "new" ? null : false,
  details: null,
  gifts: [],
});

// L'exemple de Mehdi : 3 Burgundy (2 en 256 Go, 1 en 512 Go), 1 Noir, 1 Argent, Glacier épuisé.
const iphone18ProMax = [
  variant({ Stockage: "256 Go", Couleur: "Burgundy" }, 2),
  variant({ Stockage: "512 Go", Couleur: "Burgundy" }, 1, 385000),
  variant({ Stockage: "256 Go", Couleur: "Noir" }, 1),
  variant({ Stockage: "512 Go", Couleur: "Argent" }, 1, 385000),
  variant({ Stockage: "256 Go", Couleur: "Glacier" }, 0),
];
const keys = ["Couleur", "Stockage"];
const valuesOf = (choices: ReturnType<typeof optionChoices>, key: string) =>
  choices.find((choice) => choice.key === key)?.values;

describe("optionKeys", () => {
  it("met la couleur avant le stockage pour un téléphone", () => {
    expect(optionKeys(iphone18ProMax, "phone")).toEqual([
      "Couleur",
      "Stockage",
    ]);
  });

  it("ne renvoie rien pour un produit sans options", () => {
    expect(optionKeys([variant({}, 4, 2500)], "accessory")).toEqual([]);
  });
});

describe("optionChoices", () => {
  it("compte le stock de chaque couleur, épuisées comprises", () => {
    expect(
      valuesOf(optionChoices(iphone18ProMax, keys, {}), "Couleur"),
    ).toEqual([
      { value: "Burgundy", stock: 3 },
      { value: "Noir", stock: 1 },
      { value: "Argent", stock: 1 },
      { value: "Glacier", stock: 0 },
    ]);
  });

  it("compte le stockage dans la couleur choisie", () => {
    expect(
      valuesOf(
        optionChoices(iphone18ProMax, keys, { Couleur: "Burgundy" }),
        "Stockage",
      ),
    ).toEqual([
      { value: "256 Go", stock: 2 },
      { value: "512 Go", stock: 1 },
    ]);
    expect(
      valuesOf(
        optionChoices(iphone18ProMax, keys, { Couleur: "Noir" }),
        "Stockage",
      ),
    ).toEqual([
      { value: "256 Go", stock: 1 },
      { value: "512 Go", stock: 0 },
    ]);
  });
});

describe("initialSelection et selectOption", () => {
  it("part de la variante en stock la moins chère", () => {
    expect(initialSelection(iphone18ProMax, keys)).toEqual({
      Couleur: "Burgundy",
      Stockage: "256 Go",
    });
  });

  it("passe au premier stockage disponible quand la nouvelle couleur n'a pas le stockage choisi", () => {
    expect(
      selectOption(
        iphone18ProMax,
        keys,
        { Couleur: "Burgundy", Stockage: "512 Go" },
        "Couleur",
        "Noir",
      ),
    ).toEqual({ Couleur: "Noir", Stockage: "256 Go" });
  });

  it("garde le stockage choisi quand il existe dans la nouvelle couleur", () => {
    expect(
      selectOption(
        iphone18ProMax,
        keys,
        { Couleur: "Noir", Stockage: "256 Go" },
        "Couleur",
        "Burgundy",
      ),
    ).toEqual({ Couleur: "Burgundy", Stockage: "256 Go" });
  });

  it("ne choisit rien pour un produit sans options", () => {
    expect(initialSelection([variant({}, 4, 2500)], [])).toEqual({});
  });
});

describe("conditionSummary", () => {
  it("résume le neuf scellé et les affaires en stock", () => {
    const variants = [
      ...iphone18ProMax,
      variant(
        { Stockage: "256 Go", Couleur: "Noir" },
        2,
        289000,
        "refurbished",
      ),
      variant(
        { Stockage: "256 Go", Couleur: "Burgundy" },
        1,
        275000,
        "refurbished",
      ),
      variant(
        { Stockage: "256 Go", Couleur: "Bleu" },
        0,
        199000,
        "refurbished",
      ),
    ];
    expect(conditionSummary(variants)).toEqual({
      newFrom: 335000,
      newStock: 5,
      refurbishedFrom: 275000,
      refurbishedCount: 3,
    });
  });

  it("ne donne pas de prix quand tous les neufs sont épuisés", () => {
    expect(conditionSummary([variant({ Couleur: "Noir" }, 0)])).toEqual({
      newFrom: null,
      newStock: 0,
      refurbishedFrom: null,
      refurbishedCount: 0,
    });
  });
});

// L'étape Couleur (05/11) : la couleur est déjà choisie, la page Neuf ne la redemande pas.
describe("optionKeys sans la couleur choisie", () => {
  it("retire la clé exclue", () => {
    expect(optionKeys(iphone18ProMax, "phone", "Couleur")).toEqual([
      "Stockage",
    ]);
  });
});

describe("withOriginOption", () => {
  const europe = { ...variant({ Stockage: "256 Go", Couleur: "Noir" }, 2), origin: "Europe" };
  const japon = { ...variant({ Stockage: "256 Go", Couleur: "Noir" }, 1, 320000), origin: "Japon" };

  it("fait de l'origine un choix quand deux neufs identiques viennent de deux pays", () => {
    const pickable = withOriginOption([europe, japon]);
    const withOrigin = ["Couleur", "Stockage", "Origine"];
    expect(pickable.map((item) => item.options.Origine)).toEqual(["Europe", "Japon"]);
    expect(
      valuesOf(optionChoices(pickable, withOrigin, { Couleur: "Noir", Stockage: "256 Go" }), "Origine"),
    ).toEqual([
      { value: "Europe", stock: 2 },
      { value: "Japon", stock: 1 },
    ]);
    // Le départ : le moins cher en stock, ici le Japon.
    expect(initialSelection(pickable, withOrigin).Origine).toBe("Japon");
  });

  it("nomme l'origine manquante quand les autres en ont une", () => {
    const unknown = variant({ Stockage: "256 Go", Couleur: "Noir" }, 1);
    expect(withOriginOption([europe, unknown])[1].options.Origine).toBe("Non précisée");
  });

  it("ne change rien quand tous les neufs ont la même origine, ou aucune", () => {
    const same = [europe, { ...europe, options: { Stockage: "512 Go", Couleur: "Noir" } }];
    expect(withOriginOption(same)).toBe(same);
    expect(withOriginOption(iphone18ProMax)).toBe(iphone18ProMax);
  });
});

// Une colonne d'une affiche d'accessoire mène à la fiche avec ses options (12/11).
describe("requestedSelection", () => {
  const pack = [
    variant({ Puissance: "20 W", Câble: "Lightning" }, 5, 6000),
    variant({ Puissance: "20 W", Câble: "USB-C" }, 5, 5900),
    variant({ Puissance: "45 W", Câble: "USB-C" }, 0, 7000),
  ];
  const packKeys = ["Puissance", "Câble"];

  it("choisit la variante demandée, même épuisée", () => {
    expect(requestedSelection(pack, packKeys, { Puissance: "45 W", Câble: "USB-C" })).toEqual({ Puissance: "45 W", Câble: "USB-C" });
  });

  it("complète avec la première variante qui a les options demandées", () => {
    expect(requestedSelection(pack, packKeys, { Câble: "Lightning" })).toEqual({ Puissance: "20 W", Câble: "Lightning" });
  });

  it("ignore une option inconnue ; sans option reconnue ou sans variante, null", () => {
    expect(requestedSelection(pack, packKeys, { Inconnue: "x", Puissance: "20 W" })).toEqual({ Puissance: "20 W", Câble: "Lightning" });
    expect(requestedSelection(pack, packKeys, { Inconnue: "x" })).toBeNull();
    expect(requestedSelection(pack, packKeys, { Puissance: "65 W" })).toBeNull();
    expect(requestedSelection(pack, packKeys, {})).toBeNull();
  });
});
