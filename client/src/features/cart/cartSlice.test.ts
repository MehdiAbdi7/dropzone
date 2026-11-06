import { describe, expect, it } from "vitest";
import reducer, { closeCart, openCart, removeItem, setQuantity } from "./cartSlice";

// La quantité d'une ligne suit le maximum que donne l'aperçu du panier (le stock réel).
describe("setQuantity", () => {
  const state = { items: [{ sku: "IP17PM-OR-256", quantity: 2 }], hydrated: true, open: false };

  it("borne la quantité au maximum de la ligne", () => {
    expect(reducer(state, setQuantity({ sku: "IP17PM-OR-256", quantity: 5, max: 4 })).items[0].quantity).toBe(4);
  });

  it("ne descend pas sous 1", () => {
    expect(reducer(state, setQuantity({ sku: "IP17PM-OR-256", quantity: 0, max: 4 })).items[0].quantity).toBe(1);
  });
});

// La fenêtre du panier (06/11), comme le ticket de Niwa : son état est dans le store, pour
// que l'en-tête, la barre et le bouton « Voir le panier » ouvrent la même fenêtre.
describe("openCart / closeCart", () => {
  const state = { items: [{ sku: "IP17PM-OR-256", quantity: 1 }], hydrated: true, open: false };

  it("ouvre puis ferme la fenêtre", () => {
    const opened = reducer(state, openCart());
    expect(opened.open).toBe(true);
    expect(reducer(opened, closeCart()).open).toBe(false);
  });

  it("laisse la fenêtre ouverte quand on retire le dernier article (elle dit « panier vide »)", () => {
    expect(reducer({ ...state, open: true }, removeItem("IP17PM-OR-256"))).toMatchObject({ items: [], open: true });
  });
});
