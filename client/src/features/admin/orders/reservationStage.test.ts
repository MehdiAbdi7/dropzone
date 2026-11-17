import { describe, expect, it } from "vitest";
import { isOngoingReservation, unlimitedStage, unlimitedStageLabel } from "./reservationStage";

// Où en est une réservation illimitée avec avance BaridiMob (18/11) : le magasin doit encore appeler le client
// (« à appeler »), il attend l'avance (numéro envoyé), ou l'avance est reçue (confirmée, « en cours »).
const unlimited = { reservationMode: "unlimited" as const, baridiSharedAt: null, advancePaidAt: null };

describe("unlimitedStage", () => {
  it("une réservation de deux jours n'a pas d'étape d'avance", () => {
    expect(unlimitedStage({ reservationMode: "two_days", baridiSharedAt: null, advancePaidAt: null })).toBeNull();
    expect(unlimitedStage({})).toBeNull();
  });
  it("suit le numéro envoyé puis l'avance reçue", () => {
    expect(unlimitedStage(unlimited)).toBe("call");
    expect(unlimitedStage({ ...unlimited, baridiSharedAt: "2026-11-18T10:00:00Z" })).toBe("advance");
    expect(unlimitedStage({ ...unlimited, baridiSharedAt: "2026-11-18T10:00:00Z", advancePaidAt: "2026-11-18T12:00:00Z" })).toBe("confirmed");
  });
});

describe("unlimitedStageLabel", () => {
  it("dit l'étape en toutes lettres", () => {
    expect(unlimitedStageLabel("call")).toBe("À appeler");
    expect(unlimitedStageLabel("advance")).toBe("Attente de l'avance");
    expect(unlimitedStageLabel("confirmed")).toBe("Avance reçue");
  });
});

describe("isOngoingReservation", () => {
  it("une réservation illimitée est « en cours » seulement quand l'avance est reçue, qu'elle ait été vue ou non", () => {
    expect(isOngoingReservation({ id: 1, ...unlimited }, [1])).toBe(false);
    expect(isOngoingReservation({ id: 1, ...unlimited, baridiSharedAt: "x", advancePaidAt: "y" }, [])).toBe(true);
  });
  it("une réservation de deux jours est « en cours » une fois vue", () => {
    expect(isOngoingReservation({ id: 2, reservationMode: "two_days" }, [2])).toBe(true);
    expect(isOngoingReservation({ id: 2, reservationMode: "two_days" }, [])).toBe(false);
  });
});
