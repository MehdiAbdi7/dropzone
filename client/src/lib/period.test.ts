import { describe, expect, it } from "vitest";
import { periodLabel, periodRange, shiftPeriod } from "./period";

// Les périodes de la page Historique (15/11) : des jours en texte « AAAA-MM-JJ », jamais de
// fuseau du téléphone.
describe("periodRange", () => {
  it("un jour : du jour au jour", () => {
    expect(periodRange("day", "2026-11-14")).toEqual({ from: "2026-11-14", to: "2026-11-14" });
  });

  it("un mois : du 1er au dernier jour, février compris", () => {
    expect(periodRange("month", "2026-11-14")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(periodRange("month", "2027-02-10")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
    expect(periodRange("month", "2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("une année : du 1er janvier au 31 décembre", () => {
    expect(periodRange("year", "2026-11-14")).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });
});

describe("shiftPeriod", () => {
  it("avance et recule d'un jour, en passant les fins de mois et d'année", () => {
    expect(shiftPeriod("day", "2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftPeriod("day", "2026-01-01", -1)).toBe("2025-12-31");
  });

  it("avance et recule d'un mois sans déborder : le 31 mars recule sur février, pas sur mars", () => {
    expect(shiftPeriod("month", "2026-12-15", 1)).toBe("2027-01-15");
    expect(shiftPeriod("month", "2026-01-15", -1)).toBe("2025-12-15");
    expect(shiftPeriod("month", "2026-03-31", -1)).toBe("2026-02-28");
    expect(shiftPeriod("month", "2026-01-31", 1)).toBe("2026-02-28");
  });

  it("avance et recule d'une année, le 29 février devient le 28", () => {
    expect(shiftPeriod("year", "2026-11-14", 1)).toBe("2027-11-14");
    expect(shiftPeriod("year", "2028-02-29", 1)).toBe("2029-02-28");
  });
});

describe("periodLabel", () => {
  it("écrit la période en français avec une majuscule", () => {
    expect(periodLabel("day", "2026-11-14")).toBe("Samedi 14 novembre 2026");
    expect(periodLabel("month", "2026-11-14")).toBe("Novembre 2026");
    expect(periodLabel("year", "2026-11-14")).toBe("2026");
  });
});
