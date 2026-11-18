import { describe, expect, it } from "vitest";
import { withoutCosts } from "../src/utils/withoutCosts.js";

describe("withoutCosts", () => {
  it("retire les coûts et les bénéfices à toute profondeur, garde le reste", () => {
    const body = { data: { id: 1, items: [{ sku: "A", unitPrice: 10, unitCost: 4 }], profit: 6, nested: { purchasePrice: 3, margin: 1, ok: true } } };
    expect(withoutCosts(body)).toEqual({ data: { id: 1, items: [{ sku: "A", unitPrice: 10 }], nested: { ok: true } } });
  });

  it("ne modifie pas l'objet d'origine", () => {
    const body = { unitCost: 4, a: 1 };
    withoutCosts(body);
    expect(body).toEqual({ unitCost: 4, a: 1 });
  });

  it("laisse les dates, les nombres, les textes et null tels quels", () => {
    const date = new Date("2026-11-17T10:00:00Z");
    const result = withoutCosts({ when: date, n: 0, s: "x", nothing: null });
    expect(result.when).toBe(date);
    expect(result).toEqual({ when: date, n: 0, s: "x", nothing: null });
  });
});

describe("withoutCosts : l'atelier", () => {
  it("retire le coût des pièces d'une réparation (partsCost)", () => {
    expect(withoutCosts({ data: { id: 1, paidAmount: 8_000, partsCost: 3_500 } })).toEqual({ data: { id: 1, paidAmount: 8_000 } });
  });
});
