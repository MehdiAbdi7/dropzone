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
  const empty = { grade: null, batteryHealth: null, replacedParts: [], defects: [], limitations: [] };

  it("ne renvoie rien pour un neuf", () => {
    expect(buildConditionReport({ condition: "new", ...empty })).toBeNull();
  });

  it("résume la fiche d'état d'un reconditionné", () => {
    const report = buildConditionReport({
      condition: "refurbished",
      grade: 9,
      batteryHealth: 87,
      replacedParts: ["Batterie", "Caméra arrière"],
      defects: [],
      limitations: ["Wi-Fi seulement"],
    });
    expect(report).toBe(
      "Note 9/10 · Batterie 87 % · Remplacé : Batterie, Caméra arrière · Défauts : aucun · Limitations : Wi-Fi seulement",
    );
  });
});
