import { describe, expect, it } from "vitest";
import { invoiceBlocker } from "../src/modules/invoices/invoiceRules.js";

// Quand une facture peut être imprimée (lot 6, précisions de Mehdi du 15/11) : une livraison à partir de
// « En préparation », un retrait seulement une fois récupéré, une vente au magasin et un échange tout de
// suite, jamais une commande annulée, expirée ou retournée. `null` : la facture peut être faite.
describe("invoiceBlocker", () => {
  it("livraison : à partir de « En préparation »", () => {
    expect(invoiceBlocker({ type: "delivery", status: "pending" })).toMatch(/confirm/i);
    for (const status of ["confirmed", "shipped", "delivered", "collected"] as const) {
      expect(invoiceBlocker({ type: "delivery", status }), status).toBeNull();
    }
  });

  it("retrait : seulement une fois récupéré", () => {
    expect(invoiceBlocker({ type: "pickup", status: "reserved" })).toMatch(/récup/i);
    expect(invoiceBlocker({ type: "pickup", status: "picked_up" })).toBeNull();
  });

  it("vente au magasin et échange : tout de suite", () => {
    expect(invoiceBlocker({ type: "in_store", status: "picked_up" })).toBeNull();
    expect(invoiceBlocker({ type: "exchange", status: "picked_up" })).toBeNull();
  });

  it("jamais pour une commande annulée, expirée ou retournée", () => {
    for (const type of ["delivery", "pickup", "in_store", "exchange"] as const) {
      for (const status of ["cancelled", "expired", "returned"] as const) {
        expect(invoiceBlocker({ type, status }), `${type} ${status}`).not.toBeNull();
      }
    }
  });
});
