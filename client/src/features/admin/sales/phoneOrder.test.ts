import { describe, expect, it } from "vitest";
import { buildPhoneOrderBody, emptyPhoneDraft, phoneOrderProblem, type PhoneOrderDraft } from "./phoneOrder";
import type { TicketLine } from "./ticket";
import { makeHit } from "./variantHit.fixture";

// La commande prise par téléphone (19/11) : ce que la page refuse tout de suite et ce qui part vers l'API.
const hit = makeHit();
const line = (over: Partial<TicketLine> = {}): TicketLine => ({
  hit,
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
const form = { fullName: "  Amine Test ", phone: "0555 12 34 56" };

const delivery = (over: Partial<PhoneOrderDraft> = {}): PhoneOrderDraft => ({
  ...emptyPhoneDraft("delivery"),
  wilaya: "Alger",
  commune: "Kouba",
  address: "12 rue des Frères Bouadou",
  ...over,
});
const pickup = (over: Partial<PhoneOrderDraft> = {}): PhoneOrderDraft => ({
  ...emptyPhoneDraft("pickup"),
  pickupDate: "2026-11-17",
  pickupTime: "15:00",
  ...over,
});

describe("phoneOrderProblem, livraison", () => {
  it("accepte une adresse complète, frais laissés au calcul", () => {
    expect(phoneOrderProblem(delivery())).toBeNull();
  });

  it("nomme le champ manquant", () => {
    expect(phoneOrderProblem(delivery({ wilaya: "" }))).toContain("wilaya");
    expect(phoneOrderProblem(delivery({ commune: " " }))).toContain("commune");
    expect(phoneOrderProblem(delivery({ address: "rue" }))).toContain("adresse");
  });

  it("refuse des frais négatifs, avec virgule ou trop grands, accepte 0", () => {
    for (const shippingFee of [-5, 12.5, 100_001]) {
      expect(phoneOrderProblem(delivery({ shippingFee })), String(shippingFee)).toContain("frais");
    }
    expect(phoneOrderProblem(delivery({ shippingFee: 0 }))).toBeNull();
    expect(phoneOrderProblem(delivery({ shippingFee: 1200 }))).toBeNull();
  });
});

describe("phoneOrderProblem, réservation", () => {
  it("deux jours : le jour et l'heure sont obligatoires", () => {
    expect(phoneOrderProblem(pickup())).toBeNull();
    expect(phoneOrderProblem(pickup({ pickupDate: "" }))).toContain("jour");
    expect(phoneOrderProblem(pickup({ pickupTime: "" }))).toContain("heure");
  });

  it("illimitée : rien d'autre à choisir", () => {
    expect(phoneOrderProblem(pickup({ reservationMode: "unlimited", pickupDate: "", pickupTime: "" }))).toBeNull();
  });
});

describe("buildPhoneOrderBody", () => {
  const ticket = { lines: [line()], form, note: "", acceptLimitations: false };

  it("livraison : adresse nettoyée, frais envoyés seulement quand ils sont saisis", () => {
    const auto = buildPhoneOrderBody(ticket, delivery({ commune: " Kouba ", address: " 12 rue des Frères Bouadou " }));
    expect(auto).toEqual({
      fulfillment: "delivery",
      fullName: "Amine Test",
      phone: "0555 12 34 56",
      acceptLimitations: false,
      wilaya: "Alger",
      commune: "Kouba",
      address: "12 rue des Frères Bouadou",
      lines: [{ sku: "IP-NEW-256", quantity: 1 }],
    });
    expect(buildPhoneOrderBody(ticket, delivery({ shippingFee: 1200 }))).toMatchObject({ shippingFee: 1200 });
    expect("shippingFee" in auto).toBe(false);
  });

  it("n'envoie le prix d'une ligne que s'il a été négocié, et la remarque seulement si elle existe", () => {
    const body = buildPhoneOrderBody(
      { ...ticket, note: " rappeler avant 17h ", lines: [line({ unitPrice: 240_000 })] },
      delivery(),
    );
    expect(body.lines).toEqual([{ sku: "IP-NEW-256", quantity: 1, unitPrice: 240_000 }]);
    expect(body.note).toBe("rappeler avant 17h");
  });

  it("réservation de deux jours : le jour et l'heure, jamais d'adresse ni de frais", () => {
    const body = buildPhoneOrderBody(ticket, pickup());
    expect(body).toMatchObject({ fulfillment: "pickup", reservationMode: "two_days", pickupDate: "2026-11-17", pickupTime: "15:00" });
    expect(body).not.toHaveProperty("wilaya");
    expect(body).not.toHaveProperty("shippingFee");
  });

  it("réservation illimitée : ni jour ni heure", () => {
    const body = buildPhoneOrderBody(ticket, pickup({ reservationMode: "unlimited" }));
    expect(body).toMatchObject({ fulfillment: "pickup", reservationMode: "unlimited" });
    expect(body).not.toHaveProperty("pickupDate");
    expect(body).not.toHaveProperty("pickupTime");
  });

  it("transmet l'acceptation des limitations", () => {
    expect(buildPhoneOrderBody({ ...ticket, acceptLimitations: true }, delivery()).acceptLimitations).toBe(true);
  });
});
