import { describe, expect, it } from "vitest";
import { arrivalProblem, averageAfterArrival, isOutOfStock, movementLabel, partDraftProblem, stockProblem } from "./partsView";

// Les règles de saisie de la page Pièces (18/11) : les mêmes bornes que l'API, dites en français avant l'envoi.
const draft = { name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000, stock: 2 };

describe("partDraftProblem", () => {
  it("accepte un brouillon valide, prix et stock à 0 compris", () => {
    expect(partDraftProblem(draft)).toBeNull();
    expect(partDraftProblem({ ...draft, purchasePrice: 0, salePrice: 0, stock: 0 })).toBeNull();
  });

  it("refuse un nom trop court ou trop long", () => {
    expect(partDraftProblem({ ...draft, name: " a " })).toMatch(/nom/i);
    expect(partDraftProblem({ ...draft, name: "x".repeat(81) })).toMatch(/nom/i);
  });

  it("refuse un prix vide (NaN), négatif, décimal ou trop grand, en nommant le prix", () => {
    expect(partDraftProblem({ ...draft, purchasePrice: Number.NaN })).toMatch(/prix d'achat/i);
    expect(partDraftProblem({ ...draft, purchasePrice: -1 })).toMatch(/prix d'achat/i);
    expect(partDraftProblem({ ...draft, salePrice: 12.5 })).toMatch(/prix de vente/i);
    expect(partDraftProblem({ ...draft, salePrice: 10_000_001 })).toMatch(/prix de vente/i);
  });

  it("refuse un stock de départ vide, négatif ou décimal", () => {
    expect(partDraftProblem({ ...draft, stock: Number.NaN })).toMatch(/stock/i);
    expect(partDraftProblem({ ...draft, stock: -1 })).toMatch(/stock/i);
    expect(partDraftProblem({ ...draft, stock: 1.5 })).toMatch(/stock/i);
  });
});

describe("arrivalProblem", () => {
  it("refuse une quantité de 0, trop grande ou vide", () => {
    expect(arrivalProblem({ quantity: 0, unitCost: 100 })).toMatch(/quantité/i);
    expect(arrivalProblem({ quantity: 10_001, unitCost: 100 })).toMatch(/quantité/i);
    expect(arrivalProblem({ quantity: Number.NaN, unitCost: 100 })).toMatch(/quantité/i);
  });

  it("refuse un prix d'achat vide ou négatif", () => {
    expect(arrivalProblem({ quantity: 1, unitCost: Number.NaN })).toMatch(/prix d'achat/i);
    expect(arrivalProblem({ quantity: 1, unitCost: -1 })).toMatch(/prix d'achat/i);
  });

  it("accepte un arrivage à 0 DA (pièces récupérées)", () => {
    expect(arrivalProblem({ quantity: 2, unitCost: 0 })).toBeNull();
  });
});

describe("stockProblem", () => {
  it("refuse un stock négatif, décimal ou vide", () => {
    expect(stockProblem(-1, 4)).toMatch(/stock/i);
    expect(stockProblem(2.5, 4)).toMatch(/stock/i);
    expect(stockProblem(Number.NaN, 4)).toMatch(/stock/i);
  });

  it("dit quand le stock compté est déjà celui de la pièce", () => {
    expect(stockProblem(4, 4)).toBe("Le stock est déjà de 4");
  });

  it("accepte un stock compté différent", () => {
    expect(stockProblem(3, 4)).toBeNull();
    expect(stockProblem(0, 4)).toBeNull();
  });
});

describe("isOutOfStock", () => {
  it("vrai seulement à 0", () => {
    expect(isOutOfStock({ stock: 0 })).toBe(true);
    expect(isOutOfStock({ stock: 1 })).toBe(false);
  });
});

describe("movementLabel", () => {
  it("dit un arrivage et une correction, avec leur signe", () => {
    expect(movementLabel({ kind: "arrival", delta: 2 })).toBe("Arrivage de 2");
    expect(movementLabel({ kind: "correction", delta: -1 })).toBe("Correction : −1");
    expect(movementLabel({ kind: "correction", delta: 3 })).toBe("Correction : +3");
  });
});

// L'aperçu du prix d'achat moyen dans la fenêtre d'arrivage : la même formule que l'API (partMath.ts).
describe("averageAfterArrival", () => {
  it("2 en stock à 3 500 plus 2 à 0 donnent 1 750", () => {
    expect(averageAfterArrival({ stock: 2, purchasePrice: 3_500 }, { quantity: 2, unitCost: 0 })).toBe(1_750);
  });

  it("sans stock, le prix de l'arrivage", () => {
    expect(averageAfterArrival({ stock: 0, purchasePrice: 5_000 }, { quantity: 3, unitCost: 2_800 })).toBe(2_800);
  });

  it("rien tant que la saisie est incomplète", () => {
    expect(averageAfterArrival({ stock: 2, purchasePrice: 3_500 }, { quantity: Number.NaN, unitCost: 0 })).toBeNull();
    expect(averageAfterArrival({ stock: 2, purchasePrice: 3_500 }, { quantity: 0, unitCost: 100 })).toBeNull();
  });
});
