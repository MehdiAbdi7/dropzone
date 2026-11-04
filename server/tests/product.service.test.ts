import { describe, expect, it } from "vitest";
import { buildConditionReport, computeMinPrice } from "../src/modules/products/product.service.js";
import { defaultWarrantyMonths } from "../src/modules/products/warranty.js";

describe("defaultWarrantyMonths : la garantie proposée par DropZone", () => {
  it.each([
    ["phone", "new", 12],
    ["phone", "refurbished", 6],
    ["tablet", "new", 12],
    ["tablet", "refurbished", 6],
    ["watch", "new", 12],
    ["laptop", "new", 3],
    ["laptop", "refurbished", 3],
    ["accessory", "new", null],
    ["audiovisual", "new", null],
  ] as const)("%s en %s : %s", (kind, condition, months) => {
    expect(defaultWarrantyMonths(kind, condition)).toBe(months);
  });
});

describe("computeMinPrice", () => {
  it("renvoie le plus petit prix des variantes en stock", () => {
    const variants = [
      { price: 214000, stock: 2 },
      { price: 189000, stock: 1 },
      { price: 259000, stock: 4 },
    ];
    expect(computeMinPrice(variants)).toBe(189000);
  });

  it("ignore une variante moins chère mais vendue", () => {
    const variants = [
      { price: 120000, stock: 0 },
      { price: 185000, stock: 1 },
    ];
    expect(computeMinPrice(variants)).toBe(185000);
  });

  it("prend le plus petit prix de tout si plus rien n'est en stock", () => {
    const variants = [
      { price: 42000, stock: 0 },
      { price: 39000, stock: 0 },
    ];
    expect(computeMinPrice(variants)).toBe(39000);
  });

  it("renvoie 0 sans variante", () => {
    expect(computeMinPrice([])).toBe(0);
  });
});

describe("buildConditionReport", () => {
  const sealed = {
    condition: "new" as const,
    grade: null,
    batteryHealth: null,
    replacedParts: [],
    compatibleParts: [],
    defects: [],
    limitations: [],
    withBox: null,
    details: null,
    origin: null,
    reference: null,
  };
  const deal = { ...sealed, condition: "refurbished" as const, grade: 10, batteryHealth: 80, withBox: false };

  it("dit ce que l'annonce ne précise pas, puis l'origine et la référence", () => {
    expect(
      buildConditionReport({
        ...deal,
        grade: null,
        batteryHealth: null,
        withBox: null,
        origin: "Europe",
        reference: "51057",
      }),
    ).toBe(
      "Note non précisée · Batterie non mesurée · Remplacé : rien · Défauts : aucun · Limitations : aucune · Boîte non précisée · Origine : Europe · Réf. 51057",
    );
  });

  it("ne renvoie rien pour un neuf scellé", () => {
    expect(buildConditionReport(sealed)).toBeNull();
  });

  it("résume une affaire sans boîte, avec l'origine de chaque pièce changée", () => {
    const report = buildConditionReport({
      ...deal,
      grade: 9,
      batteryHealth: 87,
      replacedParts: ["Batterie", "Caméra arrière"],
      compatibleParts: ["Caméra arrière"],
      limitations: ["Wi-Fi seulement"],
    });
    expect(report).toBe(
      "Note 9/10 · Batterie 87 % · Remplacé : Batterie (d'origine), Caméra arrière (compatible) · Défauts : aucun · Limitations : Wi-Fi seulement · Sans boîte",
    );
  });

  it("dit la boîte d'origine et ajoute les détails du gérant", () => {
    expect(buildConditionReport({ ...deal, withBox: true, details: "Comme neuf" })).toBe(
      "Note 10/10 · Batterie 80 % · Remplacé : rien · Défauts : aucun · Limitations : aucune · Avec sa boîte d'origine · Détails : Comme neuf",
    );
  });
});
