import { describe, expect, it } from "vitest";
import { pickupLabel } from "./pickupLabel";

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
