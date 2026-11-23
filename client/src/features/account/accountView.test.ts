import { describe, expect, it } from "vitest";
import { orderProgress, profileChanged } from "./accountView";

// Mon compte (23/11) : la mini-frise de chaque carte de commande et le bouton « Enregistrer » du profil.
describe("orderProgress", () => {
  it("une livraison : quatre étapes, on en est à la confirmation", () => {
    expect(orderProgress("delivery", "confirmed")).toEqual({
      steps: ["Reçue", "Confirmée", "Expédiée", "Livrée"],
      reached: 1,
      tone: "ongoing",
    });
  });

  it("une livraison livrée puis encaissée est finie, à la dernière étape", () => {
    expect(orderProgress("delivery", "delivered")).toMatchObject({ reached: 3, tone: "done" });
    expect(orderProgress("delivery", "collected")).toMatchObject({ reached: 3, tone: "done" });
  });

  it("une réservation : deux étapes", () => {
    expect(orderProgress("pickup", "reserved")).toEqual({ steps: ["Réservée", "Récupérée"], reached: 0, tone: "ongoing" });
    expect(orderProgress("pickup", "picked_up")).toMatchObject({ reached: 1, tone: "done" });
  });

  it("une commande annulée, retournée ou expirée s'arrête : pas de frise", () => {
    for (const [type, status] of [
      ["delivery", "cancelled"],
      ["delivery", "returned"],
      ["pickup", "expired"],
      ["pickup", "cancelled"],
    ] as const) {
      expect(orderProgress(type, status), `${type} ${status}`).toEqual({ steps: [], reached: -1, tone: "stopped" });
    }
  });

  it("un achat au magasin n'a pas d'étapes : il est fini", () => {
    expect(orderProgress("in_store", "picked_up")).toEqual({ steps: [], reached: -1, tone: "done" });
  });
});

describe("profileChanged", () => {
  const saved = { firstName: "Amine", lastName: "B", phone: "0555", addressWilaya: "", addressCommune: "", addressLine: "" };

  it("rien n'a changé : le bouton reste éteint", () => {
    expect(profileChanged(saved, { ...saved })).toBe(false);
  });

  it("un champ a changé", () => {
    expect(profileChanged(saved, { ...saved, addressWilaya: "Alger" })).toBe(true);
  });

  it("des espaces en plus ou en moins ne comptent pas", () => {
    expect(profileChanged(saved, { ...saved, firstName: " Amine " })).toBe(false);
  });
});
