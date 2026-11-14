import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import {
  addToTicket,
  buildSaleBody,
  pricesToSend,
  reductionText,
  syncCatalogPrices,
  ticketProblem,
  ticketReduction,
  ticketTotal,
  type TicketLine,
} from "./ticket";

// Le ticket de la vente au magasin (16/11, lot 3) : ce qui s'affiche et ce qui part vers l'API.
const hit = {
  sku: "IP-NEW-256",
  productName: "iPhone 15 Pro Max",
  options: { Stockage: "256 Go" },
  condition: "new" as const,
  price: 245_000,
  stock: 3,
  conditionReport: null,
  image: null,
};
const line = (over: Partial<TicketLine> = {}): TicketLine => ({
  key: "IP-NEW-256",
  sku: "IP-NEW-256",
  name: "iPhone 15 Pro Max",
  options: {},
  condition: "new",
  listPrice: 245_000,
  unitPrice: 245_000,
  quantity: 1,
  maxQuantity: 3,
  ...over,
});
const form = { fullName: "Amine Test", phone: "0555 12 34 56" };

describe("addToTicket", () => {
  it("ajoute une variante au prix catalogue, avec le stock pour limite", () => {
    const lines = addToTicket([], hit);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ sku: "IP-NEW-256", name: "iPhone 15 Pro Max", listPrice: 245_000, unitPrice: 245_000, quantity: 1, maxQuantity: 3 });
  });

  it("ajoute 1 à la quantité quand la variante est déjà là, sans dépasser le stock", () => {
    let lines = addToTicket([], hit);
    lines = addToTicket(lines, hit);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
    lines = addToTicket(addToTicket(lines, hit), hit);
    expect(lines[0].quantity).toBe(3);
  });

  it("plafonne la quantité à 10 par ligne même avec un gros stock", () => {
    const big = { ...hit, stock: 50 };
    let lines = addToTicket([], big);
    for (let i = 0; i < 20; i += 1) lines = addToTicket(lines, big);
    expect(lines[0].quantity).toBe(10);
    expect(lines[0].maxQuantity).toBe(10);
  });
});

describe("ticketTotal et ticketReduction", () => {
  it("additionne prix accordé × quantité", () => {
    expect(ticketTotal([line({ quantity: 2, unitPrice: 240_000 }), line({ sku: "B", key: "B", unitPrice: 1_000 })])).toBe(481_000);
  });

  it("compte la réduction : (prix catalogue − prix accordé) × quantité", () => {
    expect(ticketReduction([line({ quantity: 2, unitPrice: 240_000 })])).toBe(10_000);
    expect(ticketReduction([line()])).toBe(0);
  });

  it("est négative quand le prix dépasse le catalogue", () => {
    expect(ticketReduction([line({ unitPrice: 250_000 })])).toBe(-5_000);
  });

  it("donne NaN pour le total tant qu'un prix est vide, sans fausser la réduction", () => {
    expect(Number.isNaN(ticketTotal([line({ unitPrice: Number.NaN })]))).toBe(true);
    expect(ticketReduction([line({ unitPrice: Number.NaN })])).toBe(0);
  });
});

describe("ticketProblem", () => {
  it("accepte un ticket correct", () => {
    expect(ticketProblem([line()], form)).toBeNull();
  });
  it("refuse un ticket vide", () => {
    expect(ticketProblem([], form)).toMatch(/vide/);
  });
  it("refuse un nom trop court et un téléphone invalide", () => {
    expect(ticketProblem([line()], { ...form, fullName: "Al" })).toMatch(/nom/i);
    expect(ticketProblem([line()], { ...form, phone: "123" })).toMatch(/téléphone/i);
    expect(ticketProblem([line()], { ...form, phone: "0555-12.34 56" })).toBeNull();
  });
  it("refuse une quantité hors de 1 au stock et un prix négatif, non entier, vide ou trop grand", () => {
    expect(ticketProblem([line({ quantity: 0 })], form)).toMatch(/quantité/i);
    expect(ticketProblem([line({ quantity: 4 })], form)).toMatch(/quantité/i);
    expect(ticketProblem([line({ unitPrice: -1 })], form)).toMatch(/prix/i);
    expect(ticketProblem([line({ unitPrice: 10.5 })], form)).toMatch(/prix/i);
    expect(ticketProblem([line({ unitPrice: Number.NaN })], form)).toMatch(/prix/i);
    expect(ticketProblem([line({ unitPrice: 10_000_001 })], form)).toMatch(/prix/i);
  });
  it("accepte un prix à 0", () => {
    expect(ticketProblem([line({ unitPrice: 0 })], form)).toBeNull();
  });
});

describe("buildSaleBody", () => {
  it("envoie les lignes avec leur prix accordé, le moyen de paiement et les limitations", () => {
    const body = buildSaleBody({
      lines: [line({ quantity: 2, unitPrice: 240_000 })],
      form: { fullName: " Amine Test ", phone: "0555 12 34 56" },
      method: "card",
      note: " Vu à l'Instagram ",
      acceptLimitations: true,
    });
    expect(body).toEqual({
      fullName: "Amine Test",
      phone: "0555 12 34 56",
      method: "card",
      note: "Vu à l'Instagram",
      acceptLimitations: true,
      lines: [{ sku: "IP-NEW-256", quantity: 2, unitPrice: 240_000 }],
    });
  });

  it("n'envoie le prix d'une ligne que s'il a été négocié : sinon le serveur prend le prix catalogue d'aujourd'hui", () => {
    const body = buildSaleBody({
      lines: [line({ quantity: 1 }), line({ sku: "B", key: "B", listPrice: 1_000, unitPrice: 900 })],
      form,
      method: "cash",
      note: "",
      acceptLimitations: false,
    });
    expect(body.lines).toEqual([{ sku: "IP-NEW-256", quantity: 1 }, { sku: "B", quantity: 1, unitPrice: 900 }]);
  });

  it("n'envoie pas de remarque vide", () => {
    const body = buildSaleBody({ lines: [line()], form, method: "cash", note: "  ", acceptLimitations: false });
    expect(body).not.toHaveProperty("note");
  });
});

describe("syncCatalogPrices", () => {
  it("ne change rien quand le prix catalogue est toujours le même (et rend le même tableau)", () => {
    const lines = [line()];
    const result = syncCatalogPrices(lines, [{ sku: "IP-NEW-256", unitPrice: 245_000 }]);
    expect(result.lines).toBe(lines);
    expect(result.changed).toEqual([]);
  });

  it("met à jour le prix catalogue périmé, et le prix accordé quand il n'avait pas été négocié", () => {
    const result = syncCatalogPrices([line()], [{ sku: "IP-NEW-256", unitPrice: 239_000 }]);
    expect(result.lines[0]).toMatchObject({ listPrice: 239_000, unitPrice: 239_000 });
    expect(result.changed).toEqual(["iPhone 15 Pro Max"]);
  });

  it("garde le prix négocié du vendeur quand le catalogue change", () => {
    const result = syncCatalogPrices([line({ unitPrice: 240_000 })], [{ sku: "IP-NEW-256", unitPrice: 239_000 }]);
    expect(result.lines[0]).toMatchObject({ listPrice: 239_000, unitPrice: 240_000 });
  });

  it("ignore une ligne que le récapitulatif ne connaît pas encore", () => {
    const lines = [line()];
    expect(syncCatalogPrices(lines, []).lines).toBe(lines);
  });
});

describe("reductionText", () => {
  it("écrit le prix catalogue, le prix accordé et la différence", () => {
    expect(reductionText(line({ unitPrice: 240_000 }))).toBe(
      `${formatPrice(245_000)} → ${formatPrice(240_000)}, −${formatPrice(5_000)}`,
    );
    expect(reductionText(line({ unitPrice: 250_000 }))).toBe(
      `${formatPrice(245_000)} → ${formatPrice(250_000)}, +${formatPrice(5_000)}`,
    );
  });
  it("ne dit rien sans réduction, ni quand le prix est encore vide", () => {
    expect(reductionText(line())).toBeNull();
    expect(reductionText(line({ unitPrice: Number.NaN }))).toBeNull();
  });
});

describe("pricesToSend", () => {
  it("n'envoie que les prix changés", () => {
    expect(
      pricesToSend([
        { id: 1, unitPrice: 240_000, originalPrice: 245_000 },
        { id: 2, unitPrice: 1_000, originalPrice: 1_000 },
      ]),
    ).toEqual([{ id: 1, unitPrice: 240_000 }]);
  });
  it("n'envoie rien quand rien n'a changé, ni un prix encore vide", () => {
    expect(pricesToSend([{ id: 1, unitPrice: 245_000, originalPrice: 245_000 }])).toEqual([]);
    expect(pricesToSend([{ id: 1, unitPrice: Number.NaN, originalPrice: 245_000 }])).toEqual([]);
  });
});
