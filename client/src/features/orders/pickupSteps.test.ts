import { describe, expect, it } from "vitest";
import { pickupSteps } from "./pickupSteps";

// Les étapes d'une réservation sur la page de suivi (26/11, remarque de Mehdi) : le texte disait « jusqu'à la fermeture
// du magasin le jour choisi » même pour une réservation illimitée, qui n'a pas de jour : le délai n'existe pas pour elle.
describe("pickupSteps", () => {
  it("une réservation de deux jours garde son délai : jusqu'à la fermeture le jour choisi", () => {
    const reserved = pickupSteps("two_days").find((step) => step.status === "reserved");
    expect(reserved?.text).toContain("jusqu'à la fermeture du magasin le jour choisi");
  });

  it("une réservation sans mode connu (anciennes commandes) garde le texte des deux jours", () => {
    expect(pickupSteps(null)).toEqual(pickupSteps("two_days"));
    expect(pickupSteps(undefined)).toEqual(pickupSteps("two_days"));
  });

  it("une réservation illimitée ne parle ni de jour choisi ni de fermeture ni de remise en vente", () => {
    const reserved = pickupSteps("unlimited").find((step) => step.status === "reserved");
    expect(reserved?.text).not.toMatch(/jour choisi|fermeture|en vente/);
    expect(reserved?.text).toContain("sans date limite");
  });

  it("garde les deux mêmes étapes, dans le même ordre, quel que soit le mode", () => {
    expect(pickupSteps("unlimited").map((step) => step.status)).toEqual(["reserved", "picked_up"]);
    expect(pickupSteps("two_days").map((step) => step.status)).toEqual(["reserved", "picked_up"]);
  });

  it("l'étape Récupéré ne change pas", () => {
    const picked = (mode: "two_days" | "unlimited") => pickupSteps(mode).find((step) => step.status === "picked_up");
    expect(picked("unlimited")).toEqual(picked("two_days"));
  });
});
