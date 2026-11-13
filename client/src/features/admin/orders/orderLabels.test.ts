import { describe, expect, it } from "vitest";
import { dailyLabel, receptionLabel } from "./orderLabels";

// Les libellés de la page Commandes du back-office (14/11).
describe("dailyLabel", () => {
  it("donne le numéro du jour et sa date courte", () => {
    expect(dailyLabel(3, "2026-11-13T00:00:00.000Z")).toBe("n° 3 · 13/11");
  });
});

describe("receptionLabel", () => {
  it("une livraison dit sa wilaya", () => {
    expect(receptionLabel({ type: "delivery", wilaya: "Alger", pickupDate: null, pickupTime: null })).toBe("Livraison · Alger");
  });

  it("un retrait dit son créneau", () => {
    expect(
      receptionLabel({ type: "pickup", wilaya: null, pickupDate: "2026-11-15T00:00:00.000Z", pickupTime: "15:30" }),
    ).toBe("Retrait · dimanche 15 novembre à 15h30");
  });

  it("une vente au magasin le dit simplement", () => {
    expect(receptionLabel({ type: "in_store", wilaya: null, pickupDate: null, pickupTime: null })).toBe("Vente au magasin");
  });
});
