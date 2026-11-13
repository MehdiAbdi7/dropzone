import { describe, expect, it } from "vitest";
import { checkoutBody } from "./checkoutBody";

// Le corps envoyé à POST /orders (14/11) : une livraison avec son adresse, un retrait avec son
// jour et son heure, jamais l'adresse (l'API la refuserait comme inutile, et elle n'a pas de sens).
const values = {
  fullName: "Amine Test",
  phone: "0555123456",
  wilaya: "Alger",
  commune: "Kouba",
  address: "12 rue des Frères",
  note: "",
  acceptTerms: true,
  acceptLimitations: false,
  pickupDay: "tomorrow" as const,
  pickupTime: "15:30",
};
const cart = { items: [{ sku: "IP-NEW-256", quantity: 1 }], cartHash: "a".repeat(64) };

describe("checkoutBody", () => {
  it("une livraison envoie l'adresse et pas de créneau", () => {
    const body = checkoutBody("delivery", values, cart);
    expect(body).toMatchObject({ fulfillment: "delivery", wilaya: "Alger", commune: "Kouba", address: "12 rue des Frères" });
    expect(body).not.toHaveProperty("pickupTime");
  });

  it("un retrait envoie le jour et l'heure, sans adresse", () => {
    const body = checkoutBody("pickup", values, cart);
    expect(body).toMatchObject({ fulfillment: "pickup", pickupDay: "tomorrow", pickupTime: "15:30" });
    expect(body).not.toHaveProperty("wilaya");
    expect(body).not.toHaveProperty("address");
  });

  it("n'envoie pas une remarque vide", () => {
    expect(checkoutBody("pickup", values, cart)).not.toHaveProperty("note");
    expect(checkoutBody("pickup", { ...values, note: "Je passe vers 15h" }, cart).note).toBe("Je passe vers 15h");
  });
});
