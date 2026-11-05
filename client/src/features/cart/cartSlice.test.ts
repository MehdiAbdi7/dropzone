import { describe, expect, it } from "vitest";
import reducer, { setQuantity } from "./cartSlice";

// La quantité d'une ligne suit le maximum que donne l'aperçu du panier (le stock réel).
describe("setQuantity", () => {
  const state = { items: [{ sku: "IP17PM-OR-256", quantity: 2 }], hydrated: true };

  it("borne la quantité au maximum de la ligne", () => {
    expect(reducer(state, setQuantity({ sku: "IP17PM-OR-256", quantity: 5, max: 4 })).items[0].quantity).toBe(4);
  });

  it("ne descend pas sous 1", () => {
    expect(reducer(state, setQuantity({ sku: "IP17PM-OR-256", quantity: 0, max: 4 })).items[0].quantity).toBe(1);
  });
});
