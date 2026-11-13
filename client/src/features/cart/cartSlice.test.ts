import { describe, expect, it } from "vitest";
import reducer, { closeCart, linesConfirmed, openCart, removeItem, setQuantity } from "./cartSlice";

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

// La description de chaque ligne (13/11) : recopiée depuis la réponse du serveur, pour que le
// panier s'affiche tout de suite à la visite suivante, même quand l'API dort.
describe("linesConfirmed", () => {
  const confirmed = {
    sku: "IP17PM-OR-256",
    productId: 1,
    name: "iPhone 17 Pro Max",
    slug: "iphone-17-pro-max",
    image: "or.webp",
    options: { Couleur: "Orange" },
    condition: "new" as const,
    conditionReport: null,
    warrantyMonths: 12,
    unitPrice: 300000,
    normalPrice: 300000,
    quantity: 2,
    maxQuantity: 4,
    lineTotal: 600000,
    isGift: false,
    giftFor: null,
    problem: null,
  };
  const state = { items: [{ sku: "IP17PM-OR-256", quantity: 2 }], hydrated: true, open: false };

  it("garde la description de la ligne, sans le prix", () => {
    const next = reducer(state, linesConfirmed([confirmed]));
    expect(next.items[0].snapshot).toMatchObject({ name: "iPhone 17 Pro Max", image: "or.webp" });
    expect(JSON.stringify(next.items)).not.toMatch(/price|Price|lineTotal/);
  });

  it("ne touche ni la quantité ni un article absent de la réponse", () => {
    const withOther = { ...state, items: [...state.items, { sku: "AUTRE", quantity: 1 }] };
    const next = reducer(withOther, linesConfirmed([{ ...confirmed, quantity: 1 }]));
    expect(next.items.map((item) => item.quantity)).toEqual([2, 1]);
    expect(next.items[1].snapshot).toBeUndefined();
  });

  it("ignore les articles offerts (ils ne sont pas dans le panier du navigateur)", () => {
    const gift = { ...confirmed, sku: "CHG", isGift: true, giftFor: "IP17PM-OR-256" };
    expect(reducer(state, linesConfirmed([gift])).items).toEqual(state.items);
  });

  it("rend le même état quand rien n'a changé (aucune réécriture inutile)", () => {
    const once = reducer(state, linesConfirmed([confirmed]));
    expect(reducer(once, linesConfirmed([confirmed]))).toBe(once);
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
