import { describe, expect, it } from "vitest";
import { buildConditionReport, computeMinPrice } from "../src/modules/products/product.service.js";

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
  };
  const deal = { ...sealed, condition: "refurbished" as const, grade: 10, batteryHealth: 80, withBox: false };

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
