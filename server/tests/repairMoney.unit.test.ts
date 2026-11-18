import { describe, expect, it } from "vitest";
import { repairAmount, repairProfit } from "../src/modules/repairs/repairRules.js";

// Ce que le client paie au Rendu et ce que la réparation rapporte (étape 3).
const part = { quantity: 2, unitPrice: 6_000 };

describe("repairAmount", () => {
  it("sous garantie, le client ne paie rien, même avec une main-d'œuvre et des pièces", () => {
    expect(repairAmount({ underWarranty: true, refused: false, laborPrice: 2_000, lines: [part] })).toBe(0);
  });

  it("hors garantie : la main-d'œuvre plus les pièces au prix de vente", () => {
    expect(repairAmount({ underWarranty: false, refused: false, laborPrice: 2_000, lines: [part] })).toBe(14_000);
    expect(repairAmount({ underWarranty: false, refused: false, laborPrice: null, lines: [part] })).toBe(12_000);
  });

  it("devis refusé : seulement les frais de diagnostic saisis, jamais les pièces", () => {
    expect(repairAmount({ underWarranty: false, refused: true, laborPrice: 500, lines: [part] })).toBe(500);
    expect(repairAmount({ underWarranty: false, refused: true, laborPrice: null, lines: [part] })).toBe(0);
  });

  it("une main-d'œuvre à 0 sans pièce vaut 0", () => {
    expect(repairAmount({ underWarranty: false, refused: false, laborPrice: 0, lines: [] })).toBe(0);
  });
});

describe("repairProfit", () => {
  it("le prix payé moins le prix d'achat des pièces, négatif sous garantie", () => {
    expect(repairProfit(14_000, 7_000)).toBe(7_000);
    expect(repairProfit(0, 3_500)).toBe(-3_500);
    expect(repairProfit(500, 0)).toBe(500);
  });
});
