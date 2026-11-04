import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { showcaseUnit } from "./showcase";

const unit = (sku: string, patch: Partial<Variant> = {}): Variant => ({
  sku,
  options: {},
  price: 100000,
  stock: 1,
  condition: "refurbished",
  grade: 9,
  batteryHealth: 90,
  replacedParts: [],
  compatibleParts: [],
  defects: [],
  limitations: [],
  withBox: false,
  details: null,
  gifts: [],
  ...patch,
});

const gift = { sku: "CHG", name: "Chargeur", options: {}, price: 2500, quantity: 1, image: null, available: true };

describe("showcaseUnit : l'affaire montrée en vitrine sur l'accueil", () => {
  it("préfère une fiche complète (note, batterie, boîte) avec un article offert et sans limitation", () => {
    const variants = [
      unit("IMPORTEE", { grade: null, batteryHealth: null, withBox: null, gifts: [gift] }),
      unit("LIMITEE", { gifts: [gift], limitations: ["Face ID ne fonctionne pas"] }),
      unit("COMPLETE"),
      unit("COMPLETE-CADEAU", { gifts: [gift] }),
    ];
    expect(showcaseUnit(variants)?.sku).toBe("COMPLETE-CADEAU");
  });

  it("passe une fiche complète devant un article offert sur une fiche incomplète", () => {
    const variants = [unit("IMPORTEE", { grade: null, gifts: [gift] }), unit("COMPLETE")];
    expect(showcaseUnit(variants)?.sku).toBe("COMPLETE");
  });

  it("se contente d'une fiche incomplète s'il n'y a rien d'autre, sans limitation d'abord", () => {
    const variants = [unit("LIMITEE", { grade: null, limitations: ["Wi-Fi seulement"] }), unit("IMPORTEE", { grade: null })];
    expect(showcaseUnit(variants)?.sku).toBe("IMPORTEE");
  });

  it("ignore les neufs scellés et ne renvoie rien sans affaire", () => {
    expect(showcaseUnit([unit("NEUF", { condition: "new" })])).toBeNull();
  });
});
