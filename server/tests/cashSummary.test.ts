import { describe, expect, it } from "vitest";
import { cashSummary } from "../src/modules/cash/cashSummary.js";

// Le résumé de la caisse (14/11) : fond + entrées en espèces = ce qui devrait être dans le
// tiroir ; le comptage dit ce qui y est vraiment.
describe("cashSummary", () => {
  const movements = [
    { amount: 290000, method: "cash" as const },
    { amount: -20000, method: "cash" as const },
    { amount: 150000, method: "baridimob" as const },
  ];

  it("compare le comptage à ce que les mouvements en espèces annoncent", () => {
    expect(cashSummary({ openingFloat: 10000, countedCash: 279000 }, movements)).toEqual({
      openingFloat: 10000,
      cashIn: 270000,
      expectedCash: 280000,
      byMethod: { cash: 270000, baridimob: 150000, ccp: 0, card: 0, transfer: 0 },
      total: 420000,
      countedCash: 279000,
      entered: 269000,
      gap: -1000,
    });
  });

  it("ne calcule ni rentré ni écart tant que la caisse n'est pas comptée", () => {
    const summary = cashSummary({ openingFloat: 5000, countedCash: null }, []);
    expect(summary).toMatchObject({ expectedCash: 5000, countedCash: null, entered: null, gap: null, total: 0 });
  });
});
