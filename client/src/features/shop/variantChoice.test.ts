import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { ProductDetail, Variant } from "@/types/api";
import { colorVariants, variantChoiceLabel } from "./variantChoice";

// Le choix d'une variante sur l'écran de la couleur (27/11, remarque de Mehdi) : une seule variante sur la couleur, ses
// photos et sa vidéo s'affichent tout de suite ; à partir de deux, une liste déroulante pour choisir, et les médias suivent.
const variant = (sku: string, condition: Variant["condition"], color: string, stock: number, price: number, patch: Partial<Variant> = {}): Variant =>
  ({ sku, options: { Couleur: color }, price, stock, condition, grade: null, batteryHealth: null, ...patch }) as unknown as Variant;

const product = {
  variants: [
    variant("used-b", "refurbished", "Noir", 1, 250000, { grade: 9, batteryHealth: 91 }),
    variant("new-a", "new", "Noir", 2, 345000, { options: { Couleur: "Noir", Stockage: "256 Go" } }),
    variant("used-sold", "refurbished", "Noir", 0, 200000),
    variant("used-c", "refurbished", "Noir", 1, 220000, { grade: 8, batteryHealth: 95 }),
    variant("argent", "new", "Argent", 3, 340000),
  ],
} as unknown as ProductDetail;

describe("colorVariants", () => {
  it("rend les variantes en stock de la couleur, le neuf d'abord puis les occasions par prix croissant", () => {
    expect(colorVariants(product, "Noir", null).map((one) => one.sku)).toEqual(["new-a", "used-c", "used-b"]);
  });

  it("ne garde que l'état de la page quand il est connu", () => {
    expect(colorVariants(product, "Noir", "refurbished").map((one) => one.sku)).toEqual(["used-c", "used-b"]);
    expect(colorVariants(product, "Noir", "new").map((one) => one.sku)).toEqual(["new-a"]);
  });

  it("ignore une variante épuisée et une autre couleur", () => {
    expect(colorVariants(product, "Noir", null).map((one) => one.sku)).not.toContain("used-sold");
    expect(colorVariants(product, "Argent", null).map((one) => one.sku)).toEqual(["argent"]);
  });

  it("rend une liste vide pour une couleur sans stock", () => {
    expect(colorVariants(product, "Rose", null)).toEqual([]);
  });
});

describe("variantChoiceLabel", () => {
  const used = variant("used-b", "refurbished", "Noir", 1, 250000, { grade: 9, batteryHealth: 91 });
  const fresh = variant("new-a", "new", "Noir", 2, 345000, { options: { Couleur: "Noir", Stockage: "256 Go" } });

  it("précise Neuf ou Occasion quand la liste mélange les deux états", () => {
    expect(variantChoiceLabel(fresh, true)).toBe(`Neuf · 256 Go · ${formatPrice(345000)}`);
    expect(variantChoiceLabel(used, true)).toBe(`Occasion · état 9/10 · batterie 91 % · ${formatPrice(250000)}`);
  });

  it("ne le répète pas quand la page connaît déjà l'état", () => {
    expect(variantChoiceLabel(fresh, false)).toBe(`256 Go · ${formatPrice(345000)}`);
    expect(variantChoiceLabel(used, false)).toBe(`état 9/10 · batterie 91 % · ${formatPrice(250000)}`);
  });
});
