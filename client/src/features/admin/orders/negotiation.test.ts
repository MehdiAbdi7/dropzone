import { describe, expect, it } from "vitest";
import { negotiationState } from "./negotiation";

// La négociation des prix d'une commande pas encore payée (16/11, lot 3) : ce que la page montre et
// ce qu'elle envoie avec « Valider le retrait » ou « Confirmer ».
const items = [
  { id: 1, name: "iPhone 15", quantity: 1, unitPrice: 245_000, listPrice: 245_000, isGift: false },
  { id: 2, name: "Coque", quantity: 2, unitPrice: 1_800, listPrice: 1_800, isGift: false },
  { id: 3, name: "Chargeur", quantity: 1, unitPrice: 0, listPrice: null, isGift: true },
];

describe("negotiationState", () => {
  it("sans prix saisi : rien à envoyer, le total ne bouge pas", () => {
    expect(negotiationState(items, {}, 600)).toEqual({ toSend: [], total: 245_000 + 3_600 + 600, problem: null });
  });

  it("un prix changé : il part, et le total suit (quantité comprise, livraison gardée)", () => {
    const state = negotiationState(items, { 1: 240_000, 2: 1_500 }, 600);
    expect(state.toSend).toEqual([
      { id: 1, unitPrice: 240_000 },
      { id: 2, unitPrice: 1_500 },
    ]);
    expect(state.total).toBe(240_000 + 3_000 + 600);
    expect(state.problem).toBeNull();
  });

  it("un prix remis à sa valeur d'origine : rien à envoyer", () => {
    expect(negotiationState(items, { 1: 245_000 }, 0).toSend).toEqual([]);
  });

  it("ignore les cadeaux", () => {
    expect(negotiationState(items, { 3: 100 }, 0).toSend).toEqual([]);
  });

  it("refuse un prix vide, négatif, non entier ou trop grand, et ne renvoie pas de total faux", () => {
    for (const bad of [Number.NaN, -1, 10.5, 10_000_001]) {
      const state = negotiationState(items, { 1: bad }, 0);
      expect(state.problem, String(bad)).toMatch(/prix/i);
      expect(state.toSend).toEqual([]);
    }
    expect(Number.isNaN(negotiationState(items, { 1: Number.NaN }, 0).total)).toBe(true);
  });

  it("accepte un prix à 0", () => {
    const state = negotiationState(items, { 1: 0 }, 0);
    expect(state.problem).toBeNull();
    expect(state.toSend).toEqual([{ id: 1, unitPrice: 0 }]);
  });
});
