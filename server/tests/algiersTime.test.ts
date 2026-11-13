import { describe, expect, it } from "vitest";
import { addDays, algiersDate, algiersMidnightAfter, pickupDays, pickupSlots } from "../src/utils/algiersTime.js";

// L'heure d'Alger (UTC+1 toute l'année) et les créneaux de retrait (14/11).
const hours = { openingTime: "09:00", closingTime: "20:00", closedDays: [] as number[] };
// Une heure d'Alger donnée en UTC : 18h40 à Alger = 17h40 UTC.
const at = (algiers: string) => new Date(`${algiers}+01:00`);

describe("algiersDate", () => {
  it("change de jour à minuit à Alger, pas à minuit UTC", () => {
    expect(algiersDate(new Date("2026-11-13T22:59:00Z"))).toBe("2026-11-13");
    expect(algiersDate(new Date("2026-11-13T23:01:00Z"))).toBe("2026-11-14");
  });
});

describe("algiersMidnightAfter", () => {
  it("donne l'instant de minuit à Alger le soir du jour", () => {
    expect(algiersMidnightAfter("2026-11-13").toISOString()).toBe("2026-11-13T23:00:00.000Z");
  });
});

describe("addDays", () => {
  it("passe les fins de mois et d'année", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("pickupSlots", () => {
  it("propose des créneaux de 30 minutes, de l'ouverture à la dernière demi-heure", () => {
    const slots = pickupSlots(hours, "2026-11-15", at("2026-11-14T10:00"));
    expect(slots).toHaveLength(22);
    expect(slots[0]).toBe("09:00");
    expect(slots.at(-1)).toBe("19:30");
  });

  it("ne propose aujourd'hui que les créneaux à au moins 30 minutes", () => {
    expect(pickupSlots(hours, "2026-11-14", at("2026-11-14T18:40"))).toEqual(["19:30"]);
    expect(pickupSlots(hours, "2026-11-14", at("2026-11-14T19:00"))).toEqual(["19:30"]);
  });

  it("ne propose plus rien le soir après le dernier créneau", () => {
    expect(pickupSlots(hours, "2026-11-14", at("2026-11-14T19:45"))).toEqual([]);
  });

  it("ne propose rien un jour de fermeture", () => {
    // Le 20/11/2026 est un vendredi (5).
    expect(pickupSlots({ ...hours, closedDays: [5] }, "2026-11-20", at("2026-11-19T10:00"))).toEqual([]);
  });

  it("ne propose rien pour un jour passé", () => {
    expect(pickupSlots(hours, "2026-11-13", at("2026-11-14T10:00"))).toEqual([]);
  });
});

// Toujours deux jours de retrait à proposer (13/11) : les stories d'affaires sortent le soir,
// un client doit pouvoir réserver la nuit.
describe("pickupDays", () => {
  it("propose aujourd'hui et demain tant qu'il reste un créneau aujourd'hui", () => {
    expect(pickupDays(hours, at("2026-11-14T10:00"))).toEqual(["2026-11-14", "2026-11-15"]);
    expect(pickupDays(hours, at("2026-11-14T18:40"))).toEqual(["2026-11-14", "2026-11-15"]);
  });

  it("propose demain et après-demain quand le magasin n'a plus de créneau aujourd'hui", () => {
    expect(pickupDays(hours, at("2026-11-14T19:45"))).toEqual(["2026-11-15", "2026-11-16"]);
    expect(pickupDays(hours, at("2026-11-14T21:00"))).toEqual(["2026-11-15", "2026-11-16"]);
    expect(pickupDays(hours, at("2026-11-14T23:59"))).toEqual(["2026-11-15", "2026-11-16"]);
  });

  it("repart à zéro à minuit à Alger", () => {
    expect(pickupDays(hours, at("2026-11-15T00:05"))).toEqual(["2026-11-15", "2026-11-16"]);
  });

  it("saute les jours de fermeture pour toujours donner deux jours", () => {
    // Le 20/11/2026 est un vendredi (5) : jeudi à 10h, on propose jeudi et samedi.
    const closedFriday = { ...hours, closedDays: [5] };
    expect(pickupDays(closedFriday, at("2026-11-19T10:00"))).toEqual(["2026-11-19", "2026-11-21"]);
    expect(pickupDays(closedFriday, at("2026-11-19T21:00"))).toEqual(["2026-11-21", "2026-11-22"]);
  });

  it("ne propose rien si le magasin est toujours fermé", () => {
    expect(pickupDays({ ...hours, closedDays: [0, 1, 2, 3, 4, 5, 6] }, at("2026-11-14T10:00"))).toEqual([]);
  });
});
