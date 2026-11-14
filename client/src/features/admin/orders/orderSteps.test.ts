import { describe, expect, it } from "vitest";
import { initialStep, orderSteps } from "./orderSteps";

const labels = (type: "delivery" | "pickup", status: Parameters<typeof orderSteps>[1]) =>
  orderSteps(type, status).map((step) => `${step.label}:${step.state}`);

describe("orderSteps", () => {
  it("une livraison à confirmer : première étape en cours, les autres à venir", () => {
    expect(labels("delivery", "pending")).toEqual([
      "À confirmer:current",
      "En préparation:upcoming",
      "Expédiée:upcoming",
      "Livrée:upcoming",
      "Encaissée:upcoming",
    ]);
  });

  it("une livraison expédiée : deux étapes faites, la troisième en cours", () => {
    expect(labels("delivery", "shipped")).toEqual([
      "À confirmer:done",
      "En préparation:done",
      "Expédiée:current",
      "Livrée:upcoming",
      "Encaissée:upcoming",
    ]);
  });

  it("une livraison encaissée : tout est fait, la dernière étape n'est plus « en cours »", () => {
    expect(orderSteps("delivery", "collected").every((step) => step.state === "done")).toBe(true);
  });

  it("un retrait a deux étapes", () => {
    expect(labels("pickup", "reserved")).toEqual(["Réservée:current", "Récupérée:upcoming"]);
    expect(labels("pickup", "picked_up")).toEqual(["Réservée:done", "Récupérée:done"]);
  });

  it("une sortie (annulée, retournée, expirée) ajoute une pastille de sortie et grise les étapes", () => {
    expect(labels("delivery", "returned")).toEqual([
      "À confirmer:upcoming",
      "En préparation:upcoming",
      "Expédiée:upcoming",
      "Livrée:upcoming",
      "Encaissée:upcoming",
      "Retournée:exit",
    ]);
    expect(labels("pickup", "expired").at(-1)).toBe("Expirée:exit");
    expect(labels("pickup", "cancelled").at(-1)).toBe("Annulée:exit");
  });
});

describe("initialStep", () => {
  it("ouvre sur l'étape où en est la commande", () => {
    expect(initialStep(orderSteps("delivery", "pending"))).toBe(0);
    expect(initialStep(orderSteps("delivery", "shipped"))).toBe(2);
    expect(initialStep(orderSteps("delivery", "delivered"))).toBe(3);
  });

  it("une commande terminée ouvre sur sa dernière étape", () => {
    expect(initialStep(orderSteps("delivery", "collected"))).toBe(4);
    expect(initialStep(orderSteps("pickup", "picked_up"))).toBe(1);
  });

  it("une commande sortie ouvre sur sa pastille de sortie", () => {
    expect(initialStep(orderSteps("delivery", "cancelled"))).toBe(5);
    expect(initialStep(orderSteps("pickup", "expired"))).toBe(2);
  });
});
