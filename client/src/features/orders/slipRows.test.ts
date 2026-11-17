import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { OrderDetail } from "@/types/api";
import { slipAvailable, slipRows } from "./slipRows";

// Ce que dit le bon de commande du site (lot 6) : le texte de l'image que le client enregistre.
const order = (over: Partial<OrderDetail> = {}): OrderDetail => ({
  number: 1017,
  status: "pending",
  createdAt: "2026-11-15T17:44:00.000Z",
  type: "delivery",
  dailyNumber: 3,
  pickupDate: null,
  pickupTime: null,
  subtotal: 159_000,
  shippingFee: 0,
  total: 159_000,
  wilaya: "Alger",
  commune: "Ouled Fayet",
  items: [
    { sku: "S25-512", name: "Galaxy S25+", options: { Stockage: "512 Go", Couleur: "Mint" }, condition: "new", conditionReport: null, warrantyMonths: 6, unitPrice: 159_000, quantity: 1, isGift: false },
  ],
  ...over,
});

describe("slipRows", () => {
  it("une livraison : l'adresse, la livraison offerte, le total, à payer à la livraison", () => {
    const rows = slipRows(order());
    expect(rows).toMatchObject({
      title: "BON DE COMMANDE",
      number: "n° 1017",
      where: "Livraison à Ouled Fayet, Alger",
      shipping: "Offerte",
      total: formatPrice(159_000),
      payNote: "À payer à la livraison",
    });
    expect(rows.items).toEqual([{ title: "1 × Galaxy S25+", detail: "Neuf scellé · 512 Go, Mint · Garantie 6 mois", price: formatPrice(159_000) }]);
  });

  it("des frais de livraison s'écrivent en dinars", () => {
    expect(slipRows(order({ shippingFee: 600, total: 159_600 })).shipping).toBe(formatPrice(600));
  });

  it("un retrait : le créneau, pas de ligne de livraison, à payer au magasin", () => {
    const rows = slipRows(order({ type: "pickup", pickupDate: "2026-11-16", pickupTime: "15:30", wilaya: null, commune: null }));
    expect(rows.where).toMatch(/^Réservation au magasin /);
    expect(rows.shipping).toBeNull();
    expect(rows.payNote).toBe("À payer au magasin");
  });

  it("un article offert s'écrit « Offert »", () => {
    const rows = slipRows(order({ items: [{ ...order().items[0], isGift: true, unitPrice: 0 }] }));
    expect(rows.items[0].price).toBe("Offert");
  });

  it("dit que ce n'est pas une facture", () => {
    expect(slipRows(order()).footer).toMatch(/pas une facture/);
  });
});

describe("slipAvailable", () => {
  it("existe pour une livraison et un retrait en cours ou terminés", () => {
    for (const type of ["delivery", "pickup"] as const) {
      for (const status of ["pending", "confirmed", "shipped", "delivered", "reserved", "picked_up", "collected"] as const) {
        expect(slipAvailable({ type, status }), `${type} ${status}`).toBe(true);
      }
    }
  });

  it("n'existe pas pour une commande annulée, expirée ou retournée", () => {
    for (const status of ["cancelled", "expired", "returned"] as const) {
      expect(slipAvailable({ type: "delivery", status }), status).toBe(false);
    }
  });

  it("n'existe pas pour une vente au magasin ni un échange (leur papier est la facture)", () => {
    expect(slipAvailable({ type: "in_store", status: "picked_up" })).toBe(false);
    expect(slipAvailable({ type: "exchange", status: "picked_up" })).toBe(false);
  });
});
