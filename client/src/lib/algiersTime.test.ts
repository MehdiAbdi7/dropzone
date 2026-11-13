import { describe, expect, it } from "vitest";
import { addDays, algiersDate, pickupSlots } from "./algiersTime";

// La copie front des créneaux de retrait (14/11) : le formulaire propose ce que l'API acceptera.
const hours = { openingTime: "09:00", closingTime: "20:00", closedDays: [] as number[] };
const at = (algiers: string) => new Date(`${algiers}+01:00`);

describe("créneaux de retrait côté front", () => {
  it("change de jour à minuit à Alger", () => {
    expect(algiersDate(new Date("2026-11-13T23:01:00Z"))).toBe("2026-11-14");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("propose les demi-heures de la journée, et le soir seulement ce qui reste", () => {
    expect(pickupSlots(hours, "2026-11-15", at("2026-11-14T10:00"))).toHaveLength(22);
    expect(pickupSlots(hours, "2026-11-14", at("2026-11-14T18:40"))).toEqual(["19:30"]);
    expect(pickupSlots(hours, "2026-11-14", at("2026-11-14T19:45"))).toEqual([]);
  });

  it("ne propose rien un jour de fermeture", () => {
    expect(pickupSlots({ ...hours, closedDays: [5] }, "2026-11-20", at("2026-11-19T10:00"))).toEqual([]);
  });
});
