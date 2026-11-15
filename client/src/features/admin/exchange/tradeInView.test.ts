import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import { marginText, resaleProblem, resalePrice, sheetSummary } from "./tradeInView";

// La liste des reprises à mettre en vente (lot 5) : le prix de revente et la marge.
describe("resalePrice et resaleProblem", () => {
  it("lit un nombre entier de dinars", () => {
    expect(resalePrice("175000")).toBe(175_000);
    expect(resalePrice(" 0 ")).toBe(0);
    expect(resaleProblem("175000")).toBeNull();
  });

  it("refuse un prix vide, à virgule, négatif, en lettres ou énorme", () => {
    for (const text of ["", "  ", "1.5", "-5", "abc", "10000001"]) {
      expect(resaleProblem(text), text).toMatch(/prix de revente/i);
    }
  });
});

describe("marginText", () => {
  it("dit la marge, ou que la revente est à perte", () => {
    expect(marginText(175_000, 150_000)).toBe(`Marge : ${formatPrice(25_000)}`);
    expect(marginText(140_000, 150_000)).toBe(`À perte : ${formatPrice(10_000)} de moins que la reprise`);
    expect(marginText(150_000, 150_000)).toBe("Aucune marge : au prix de la reprise");
  });

  it("ne dit rien tant que le prix n'est pas tapé", () => {
    expect(marginText(Number.NaN, 150_000)).toBeNull();
  });
});

describe("sheetSummary", () => {
  it("résume la fiche d'état en une ligne", () => {
    expect(sheetSummary({ grade: 8, batteryHealth: 88, defects: ["Rayure"], replacedParts: [], withBox: false })).toBe(
      "8/10 · batterie 88 % · 1 défaut · sans boîte",
    );
  });

  it("accorde les pluriels et omet ce qui manque", () => {
    expect(sheetSummary({ defects: ["A", "B"], replacedParts: ["Écran", "Batterie"], withBox: true })).toBe(
      "2 défauts · 2 pièces changées · avec sa boîte",
    );
    expect(sheetSummary({})).toBe("");
  });
});
