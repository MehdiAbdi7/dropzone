import { describe, expect, it } from "vitest";
import { isUnderWarranty, warrantyEndDate } from "../src/modules/repairs/warranty.js";

// La fin de garantie : le jour de la vente plus les mois de l'article, fin de mois ramenée au dernier jour du
// mois d'arrivée, ou la date explicite d'un appareil de remplacement (étape 6).
describe("warrantyEndDate", () => {
  it("ajoute les mois au jour de la vente", () => {
    expect(warrantyEndDate("2026-03-01", 12)).toBe("2027-03-01");
    expect(warrantyEndDate("2026-03-15", 6)).toBe("2026-09-15");
  });

  it("ramène une fin de mois au dernier jour du mois d'arrivée", () => {
    expect(warrantyEndDate("2026-08-31", 6)).toBe("2027-02-28");
    expect(warrantyEndDate("2027-08-31", 6)).toBe("2028-02-29");
    expect(warrantyEndDate("2028-02-29", 12)).toBe("2029-02-28");
  });

  it("passe d'une année à l'autre", () => {
    expect(warrantyEndDate("2026-11-30", 3)).toBe("2027-02-28");
  });

  it("préfère la date explicite quand elle existe", () => {
    expect(warrantyEndDate("2026-03-01", 12, "2027-01-15")).toBe("2027-01-15");
    expect(warrantyEndDate("2026-03-01", 12, null)).toBe("2027-03-01");
  });
});

describe("isUnderWarranty", () => {
  it("compte le dernier jour, pas le lendemain", () => {
    expect(isUnderWarranty("2027-03-01", "2027-03-01")).toBe(true);
    expect(isUnderWarranty("2027-03-01", "2027-02-28")).toBe(true);
    expect(isUnderWarranty("2027-03-01", "2027-03-02")).toBe(false);
  });

  it("sans date de fin, jamais sous garantie", () => {
    expect(isUnderWarranty(null, "2027-03-01")).toBe(false);
  });
});
