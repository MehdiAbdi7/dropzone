import { describe, expect, it } from "vitest";
import { dismantleBody, usePartProblem } from "./tradeInPartsRules";

// Démonter une reprise à 0 DA pour pièces, ou utiliser une pièce pour la remettre en état (atelier, étape 6) : ce que
// l'écran refuse tout de suite et ce qui part vers l'API.
describe("dismantleBody", () => {
  it("garde les lignes remplies, avec leur pièce et leur quantité", () => {
    expect(dismantleBody([{ partId: 3, quantity: "2" }, { partId: 5, quantity: "1" }])).toEqual({
      parts: [
        { partId: 3, quantity: 2 },
        { partId: 5, quantity: 1 },
      ],
      error: null,
    });
  });
  it("ignore une ligne vide (sans pièce ou sans quantité)", () => {
    expect(dismantleBody([{ partId: null, quantity: "" }, { partId: 3, quantity: "2" }]).parts).toEqual([{ partId: 3, quantity: 2 }]);
  });
  it("additionne la même pièce choisie deux fois", () => {
    expect(dismantleBody([{ partId: 3, quantity: "2" }, { partId: 3, quantity: "1" }]).parts).toEqual([{ partId: 3, quantity: 3 }]);
  });
  it("refuse une quantité nulle ou trop grande, et une liste sans pièce", () => {
    expect(dismantleBody([{ partId: 3, quantity: "0" }]).error).toContain("quantité");
    expect(dismantleBody([{ partId: 3, quantity: "101" }]).error).toContain("quantité");
    expect(dismantleBody([{ partId: null, quantity: "" }]).error).toContain("au moins une pièce");
  });
});

describe("usePartProblem", () => {
  const part = { id: 3, name: "Batterie iPhone 13", stock: 2 };
  it("demande une pièce puis une quantité entière", () => {
    expect(usePartProblem(null, "1")).toContain("pièce");
    expect(usePartProblem(part, "")).toContain("quantité");
    expect(usePartProblem(part, "0")).toContain("quantité");
  });
  it("refuse plus que le stock en nommant la pièce", () => {
    expect(usePartProblem(part, "3")).toContain("Batterie iPhone 13");
    expect(usePartProblem(part, "2")).toBeNull();
  });
});
