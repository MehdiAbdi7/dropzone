import { describe, expect, it } from "vitest";
import type { Options, Variant } from "@/types/api";
import { conditionSummary, initialSelection, optionChoices, optionKeys, selectOption } from "./stock";

const variant = (options: Options, stock: number, price = 335000, condition: Variant["condition"] = "new"): Variant => ({
  sku: `${options.Couleur ?? "X"}-${options.Stockage ?? "X"}-${price}-${condition}`,
  options,
  price,
  stock,
  condition,
  grade: condition === "new" ? null : 9,
  batteryHealth: condition === "new" ? null : 95,
  replacedParts: [],
  defects: [],
  limitations: [],
  gifts: [],
});

// L'exemple de Mehdi : 3 Bordeaux (2 en 256 Go, 1 en 512 Go), 1 Noir, 1 Argent, Glacier épuisé.
const iphone18ProMax = [
  variant({ Stockage: "256 Go", Couleur: "Bordeaux" }, 2),
  variant({ Stockage: "512 Go", Couleur: "Bordeaux" }, 1, 385000),
  variant({ Stockage: "256 Go", Couleur: "Noir" }, 1),
  variant({ Stockage: "512 Go", Couleur: "Argent" }, 1, 385000),
  variant({ Stockage: "256 Go", Couleur: "Glacier" }, 0),
];
const keys = ["Couleur", "Stockage"];
const valuesOf = (choices: ReturnType<typeof optionChoices>, key: string) =>
  choices.find((choice) => choice.key === key)?.values;

describe("optionKeys", () => {
  it("met la couleur avant le stockage pour un téléphone", () => {
    expect(optionKeys(iphone18ProMax, "phone")).toEqual(["Couleur", "Stockage"]);
  });

  it("ne renvoie rien pour un produit sans options", () => {
    expect(optionKeys([variant({}, 4, 2500)], "accessory")).toEqual([]);
  });
});

describe("optionChoices", () => {
  it("compte le stock de chaque couleur, épuisées comprises", () => {
    expect(valuesOf(optionChoices(iphone18ProMax, keys, {}), "Couleur")).toEqual([
      { value: "Bordeaux", stock: 3 },
      { value: "Noir", stock: 1 },
      { value: "Argent", stock: 1 },
      { value: "Glacier", stock: 0 },
    ]);
  });

  it("compte le stockage dans la couleur choisie", () => {
    expect(valuesOf(optionChoices(iphone18ProMax, keys, { Couleur: "Bordeaux" }), "Stockage")).toEqual([
      { value: "256 Go", stock: 2 },
      { value: "512 Go", stock: 1 },
    ]);
    expect(valuesOf(optionChoices(iphone18ProMax, keys, { Couleur: "Noir" }), "Stockage")).toEqual([
      { value: "256 Go", stock: 1 },
      { value: "512 Go", stock: 0 },
    ]);
  });
});

describe("initialSelection et selectOption", () => {
  it("part de la variante en stock la moins chère", () => {
    expect(initialSelection(iphone18ProMax, keys)).toEqual({ Couleur: "Bordeaux", Stockage: "256 Go" });
  });

  it("passe au premier stockage disponible quand la nouvelle couleur n'a pas le stockage choisi", () => {
    expect(
      selectOption(iphone18ProMax, keys, { Couleur: "Bordeaux", Stockage: "512 Go" }, "Couleur", "Noir"),
    ).toEqual({ Couleur: "Noir", Stockage: "256 Go" });
  });

  it("garde le stockage choisi quand il existe dans la nouvelle couleur", () => {
    expect(
      selectOption(iphone18ProMax, keys, { Couleur: "Noir", Stockage: "256 Go" }, "Couleur", "Bordeaux"),
    ).toEqual({ Couleur: "Bordeaux", Stockage: "256 Go" });
  });

  it("ne choisit rien pour un produit sans options", () => {
    expect(initialSelection([variant({}, 4, 2500)], [])).toEqual({});
  });
});

describe("conditionSummary", () => {
  it("résume le neuf et le reconditionné en stock", () => {
    const variants = [
      ...iphone18ProMax,
      variant({ Stockage: "256 Go", Couleur: "Noir" }, 1, 289000, "refurbished"),
      variant({ Stockage: "256 Go", Couleur: "Bordeaux" }, 1, 275000, "refurbished"),
      variant({ Stockage: "256 Go", Couleur: "Bleu" }, 0, 199000, "refurbished"),
    ];
    expect(conditionSummary(variants)).toEqual({
      newFrom: 335000,
      newStock: 5,
      refurbishedFrom: 275000,
      refurbishedCount: 2,
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
