import { describe, expect, it } from "vitest";
import { defaultWarrantyMonths, warrantyLabel, warrantyRange } from "./warranty";

describe("defaultWarrantyMonths : la garantie proposée par DropZone (même règle que l'API)", () => {
  it.each([
    ["phone", "new", 12],
    ["phone", "refurbished", 6],
    ["tablet", "new", 12],
    ["tablet", "refurbished", 6],
    ["watch", "refurbished", 6],
    ["laptop", "new", 3],
    ["laptop", "refurbished", 3],
    ["accessory", "new", null],
    ["audiovisual", "new", null],
  ] as const)("%s en %s : %s", (kind, condition, months) => {
    expect(defaultWarrantyMonths(kind, condition)).toBe(months);
  });
});

describe("warrantyLabel", () => {
  it("dit la garantie en mois", () => {
    expect(warrantyLabel(6)).toBe("Garantie 6 mois");
  });

  it("ne dit rien sans garantie (accessoire) ni pour une réponse en cache sans ce champ", () => {
    expect(warrantyLabel(null)).toBeNull();
    expect(warrantyLabel(undefined)).toBeNull();
  });
});

describe("warrantyRange : la garantie d'une carte de l'étape 4", () => {
  it("donne la fourchette des variantes en stock", () => {
    expect(
      warrantyRange([
        { warrantyMonths: 12, stock: 2 },
        { warrantyMonths: 6, stock: 1 },
        { warrantyMonths: 12, stock: 1 },
      ]),
    ).toBe("Garantie 6 à 12 mois");
  });

  it("donne une seule durée quand toutes les variantes en stock ont la même, sans compter les épuisées", () => {
    expect(
      warrantyRange([
        { warrantyMonths: 12, stock: 3 },
        { warrantyMonths: 3, stock: 0 },
      ]),
    ).toBe("Garantie 12 mois");
  });

  it("ne dit rien quand aucune variante en stock n'a de garantie connue", () => {
    expect(warrantyRange([{ warrantyMonths: null, stock: 2 }, { stock: 1 }])).toBeNull();
    expect(warrantyRange([{ warrantyMonths: 6, stock: 0 }])).toBeNull();
  });
});
