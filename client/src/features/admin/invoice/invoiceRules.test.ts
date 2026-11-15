import { describe, expect, it } from "vitest";
import { invoiceAvailable } from "./invoiceRules";

// Quand le bouton « Facture » s'affiche (lot 6, précisions de Mehdi du 15/11). C'est la même règle que celle
// de l'API (`invoiceBlocker`) : l'API refuse de toute façon, l'écran évite de proposer ce qui sera refusé.
describe("invoiceAvailable", () => {
  it("livraison : à partir de « En préparation »", () => {
    expect(invoiceAvailable({ type: "delivery", status: "pending" })).toBe(false);
    for (const status of ["confirmed", "shipped", "delivered", "collected"] as const) {
      expect(invoiceAvailable({ type: "delivery", status }), status).toBe(true);
    }
  });

  it("retrait : seulement une fois récupéré", () => {
    expect(invoiceAvailable({ type: "pickup", status: "reserved" })).toBe(false);
    expect(invoiceAvailable({ type: "pickup", status: "picked_up" })).toBe(true);
  });

  it("vente au magasin et échange : tout de suite", () => {
    expect(invoiceAvailable({ type: "in_store", status: "picked_up" })).toBe(true);
    expect(invoiceAvailable({ type: "exchange", status: "picked_up" })).toBe(true);
  });

  it("jamais pour une commande annulée, expirée ou retournée", () => {
    for (const type of ["delivery", "pickup", "in_store", "exchange"] as const) {
      for (const status of ["cancelled", "expired", "returned"] as const) {
        expect(invoiceAvailable({ type, status }), `${type} ${status}`).toBe(false);
      }
    }
  });
});
