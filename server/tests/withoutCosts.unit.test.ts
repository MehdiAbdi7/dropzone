import { describe, expect, it } from "vitest";
import { CLIENT_MONEY_KEYS, TECHNICIAN_COST_KEYS, withoutCosts, withoutKeys } from "../src/utils/withoutCosts.js";

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

describe("withoutCosts avec une liste à garder, et withoutKeys", () => {
  it("garde les clés demandées et retire quand même les bénéfices", () => {
    const body = { unitCost: 3_500, purchasePrice: 3_000, partsCost: 7_000, profit: 5, margin: 2, ok: 1 };
    expect(withoutCosts(body, TECHNICIAN_COST_KEYS)).toEqual({ unitCost: 3_500, purchasePrice: 3_000, partsCost: 7_000, ok: 1 });
  });

  it("withoutKeys retire l'argent du client à toute profondeur, sans toucher au reste", () => {
    const body = { data: [{ id: 1, laborPrice: 2_000, parts: [{ unitPrice: 6_000, unitCost: 3_500 }], nested: { paidAmount: 8_000, amountDue: 0, total: 8_000, price: 1, payMethod: "cash", keep: true } }] };
    expect(withoutKeys(body, CLIENT_MONEY_KEYS)).toEqual({ data: [{ id: 1, parts: [{ unitCost: 3_500 }], nested: { keep: true } }] });
  });
});
