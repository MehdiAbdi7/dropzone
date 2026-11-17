import { describe, expect, it } from "vitest";
import { pickupLabel, reservationWhere } from "./pickupLabel";

// Le créneau d'un retrait en français (14/11), pour la confirmation et le suivi.
describe("pickupLabel", () => {
  it("écrit le jour de la semaine, la date et l'heure", () => {
    // Le 15/11/2026 est un dimanche.
    expect(pickupLabel("2026-11-15", "15:30")).toBe("dimanche 15 novembre à 15h30");
  });

  it("ne décale jamais le jour, quel que soit le fuseau du navigateur", () => {
    expect(pickupLabel("2026-12-31", "09:00")).toBe("jeudi 31 décembre à 09h00");
  });
});

// La phrase « où et quand » d'une commande en réservation (18/11) : deux jours avec leur créneau, ou illimitée avec
// son avance ; rien pour une livraison.
describe("reservationWhere", () => {
  const base = { type: "pickup" as const, pickupDate: null, pickupTime: null, reservationMode: null, advanceAmount: null };
  it("une réservation de deux jours dit son créneau", () => {
    expect(reservationWhere({ ...base, pickupDate: "2026-11-15", pickupTime: "15:30", reservationMode: "two_days" })).toBe(
      `Réservation au magasin ${pickupLabel("2026-11-15", "15:30")}`,
    );
  });
  it("une ancienne commande sans mode, avec un créneau, reste une réservation de deux jours", () => {
    expect(reservationWhere({ ...base, pickupDate: "2026-11-15", pickupTime: "15:30" })).toContain("Réservation au magasin");
  });
  it("une réservation illimitée dit son avance", () => {
    expect(reservationWhere({ ...base, reservationMode: "unlimited", advanceAmount: 20_000 })).toMatch(/Réservation illimitée au magasin \(avance de 20.000/);
  });
  it("une livraison n'a rien à dire", () => {
    expect(reservationWhere({ ...base, type: "delivery" })).toBeNull();
  });
});
