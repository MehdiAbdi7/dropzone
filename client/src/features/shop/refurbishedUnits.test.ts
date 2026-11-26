import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { Variant } from "@/types/api";
import { unitLabel } from "./refurbishedUnits";

// Le libellé de chaque appareil dans la liste déroulante des occasions (27/11, remarque de Mehdi : « mettre une liste
// déroulante pour le choix des variantes disponibles »). Une ligne qui suffit à les distinguer : ce qui change d'un
// appareil à l'autre (stockage, état, batterie) et son prix. La couleur est déjà choisie à l'étape d'avant : elle n'y est pas.
const unit = (patch: Partial<Variant>): Variant =>
  ({ sku: "A", options: { Couleur: "Titane noir", Stockage: "256 Go", RAM: "8 Go" }, price: 204000, grade: 10, batteryHealth: 86, ...patch }) as Variant;

describe("unitLabel", () => {
  it("donne les options, l'état, la batterie et le prix, sans la couleur", () => {
    const label = unitLabel(unit({}));
    expect(label).toContain("256 Go");
    expect(label).toContain("8 Go");
    expect(label).toContain("état 10/10");
    expect(label).toContain("batterie 86 %");
    expect(label).toContain(formatPrice(204000));
    expect(label).not.toContain("Titane noir");
  });

  it("sépare les morceaux par des points médians", () => {
    expect(unitLabel(unit({ options: { Stockage: "128 Go" }, grade: 9, batteryHealth: 91, price: 150000 }))).toBe(
      `128 Go · état 9/10 · batterie 91 % · ${formatPrice(150000)}`,
    );
  });

  it("saute ce qui manque : pas d'état, pas de batterie, pas d'option", () => {
    expect(unitLabel(unit({ options: { Couleur: "Noir" }, grade: null, batteryHealth: null, price: 99000 }))).toBe(formatPrice(99000));
    expect(unitLabel(unit({ options: {}, grade: 8, batteryHealth: null, price: 99000 }))).toBe(`état 8/10 · ${formatPrice(99000)}`);
  });
});
