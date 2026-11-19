import { describe, expect, it } from "vitest";
import {
  buildPhoneOrderBody,
  emptyPhoneDraft,
  phoneOrderProblem,
  phoneOrderShipping,
  phoneOrderTotal,
  unlimitedReservationNote,
  type PhoneOrderDraft,
} from "./phoneOrder";
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

// Les frais et le total d'une commande par téléphone : la même base que le serveur, le sous-total APRÈS les
// prix accordés (le vendeur lit ce total au client avant de créer la commande).
describe("phoneOrderShipping", () => {
  it("une réservation n'a jamais de frais", () => {
    expect(phoneOrderShipping(5_000, pickup())).toBe(0);
  });

  it("des frais saisis priment, y compris 0", () => {
    expect(phoneOrderShipping(5_000, delivery({ shippingFee: 1200 }))).toBe(1200);
    expect(phoneOrderShipping(5_000, delivery({ shippingFee: 0 }))).toBe(0);
  });

  it("sans frais saisis, la règle du site s'applique au sous-total accordé", () => {
    // 10 500 au catalogue mais 9 800 accordés : 600 de frais (le serveur calcule sur le prix accordé).
    expect(phoneOrderShipping(9_800, delivery())).toBe(600);
    // 9 500 monté à 10 200 : livraison offerte.
    expect(phoneOrderShipping(10_200, delivery())).toBe(0);
    expect(phoneOrderShipping(10_000, delivery())).toBe(0);
    expect(phoneOrderShipping(0, delivery())).toBe(0);
  });

  it("reste vide (NaN) tant qu'un prix du ticket manque", () => {
    expect(phoneOrderShipping(Number.NaN, delivery())).toBeNaN();
  });
});

describe("phoneOrderTotal", () => {
  it("ajoute les frais au sous-total", () => {
    expect(phoneOrderTotal(245_000, delivery({ shippingFee: 1200 }))).toBe(246_200);
    expect(phoneOrderTotal(3_500, delivery())).toBe(4_100);
    expect(phoneOrderTotal(245_000, pickup())).toBe(245_000);
  });
});

describe("unlimitedReservationNote", () => {
  it("dit au responsable des commandes quoi faire ensuite", () => {
    expect(unlimitedReservationNote(true, 5_000)).toMatch(/envoyez ensuite le numéro BaridiMob/);
  });

  it("renvoie un vendeur, qui n'a pas ces boutons, vers un responsable", () => {
    const note = unlimitedReservationNote(false, 5_000);
    expect(note).toMatch(/responsable/);
    expect(note).not.toMatch(/envoyez/);
  });
});
