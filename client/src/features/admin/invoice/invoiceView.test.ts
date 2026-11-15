import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { Invoice } from "@/features/admin/api/invoiceApi";
import { customerAddress, exchangeText, invoiceDate, invoiceTypeLabel, legalLines, paymentText } from "./invoiceView";

// Ce que la facture écrit (lot 6) : les phrases qui dépendent du type de commande et des champs remplis.
const shop = { name: "DropZone", legalForm: "", address: "", phones: "", email: "", instagram: "", registerNumber: "", nif: "", nis: "", taxArticle: "", rib: "" };

describe("invoiceDate", () => {
  it("écrit le jour d'Alger, JJ/MM/AAAA", () => {
    expect(invoiceDate("2026-11-16T09:00:00.000Z")).toBe("16/11/2026");
    // 23h30 UTC est déjà le lendemain à Alger (UTC+1).
    expect(invoiceDate("2026-11-16T23:30:00.000Z")).toBe("17/11/2026");
  });
});

describe("paymentText", () => {
  it("dit le moyen utilisé", () => {
    expect(paymentText({ payment: { methods: ["cash"], paid: 1 }, order: { type: "in_store" } as Invoice["order"] })).toBe("Espèces");
    expect(paymentText({ payment: { methods: ["cash", "card"], paid: 1 }, order: { type: "in_store" } as Invoice["order"] })).toBe("Espèces, Carte");
  });

  it("dit ce qui reste à faire quand rien n'est payé", () => {
    expect(paymentText({ payment: null, order: { type: "delivery" } as Invoice["order"] })).toBe("À payer à la livraison");
    expect(paymentText({ payment: null, order: { type: "pickup" } as Invoice["order"] })).toBe("À payer");
  });
});

describe("invoiceTypeLabel", () => {
  it("écrit le type de la commande", () => {
    expect(invoiceTypeLabel({ order: { type: "delivery" } as Invoice["order"] })).toBe("Livraison");
    expect(invoiceTypeLabel({ order: { type: "exchange" } as Invoice["order"] })).toBe("Échange");
  });
});

describe("exchangeText", () => {
  it("dit qui a payé la différence", () => {
    expect(exchangeText(95_000)).toBe(`Différence payée par le client : ${formatPrice(95_000)}`);
    expect(exchangeText(-15_000)).toBe(`Différence rendue au client : ${formatPrice(15_000)}`);
    expect(exchangeText(0)).toBe("Aucune différence à payer");
  });
});

describe("legalLines", () => {
  it("n'écrit que les champs remplis", () => {
    expect(legalLines(shop)).toEqual([]);
    expect(legalLines({ ...shop, nif: "001234567890123", registerNumber: "16/00-1234567B26", nis: "  " })).toEqual([
      "RC : 16/00-1234567B26",
      "NIF : 001234567890123",
    ]);
  });
});

describe("customerAddress", () => {
  it("écrit l'adresse d'une livraison, rien pour une vente", () => {
    expect(customerAddress({ fullName: "A", phone: "1", wilaya: "Alger", commune: "Kouba", address: "12 rue des Frères Bouadou" })).toBe(
      "12 rue des Frères Bouadou, Kouba, Alger",
    );
    expect(customerAddress({ fullName: "A", phone: "1", wilaya: null, commune: null, address: null })).toBeNull();
  });
});
