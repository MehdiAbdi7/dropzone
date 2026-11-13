import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { clampQuantity, quantityLimit, showCartBar } from "./cartQuantity";

const variant = (stock: number, condition: Variant["condition"] = "new") => ({ stock, condition }) as Variant;

describe("quantityLimit", () => {
  it("laisse prendre tout le stock d'un neuf, jamais plus", () => {
    expect(quantityLimit(variant(4), 0)).toBe(4);
  });

  it("retire ce qui est déjà au panier", () => {
    expect(quantityLimit(variant(4), 3)).toBe(1);
    expect(quantityLimit(variant(4), 4)).toBe(0);
  });

  it("garde la limite de 10 par ligne", () => {
    expect(quantityLimit(variant(25), 0)).toBe(10);
  });

  it("limite une affaire au stock disponible", () => {
    expect(quantityLimit(variant(1, "refurbished"), 0)).toBe(1);
    expect(quantityLimit(variant(1, "refurbished"), 1)).toBe(0);
    expect(quantityLimit(variant(4, "refurbished"), 0)).toBe(4);
    expect(quantityLimit(variant(4, "refurbished"), 3)).toBe(1);
  });

  it("ne descend jamais sous zéro", () => {
    expect(quantityLimit(variant(2), 5)).toBe(0);
  });
});

describe("clampQuantity", () => {
  it("ramène la quantité dans la limite, au moins 1", () => {
    expect(clampQuantity(3, 1)).toBe(1);
    expect(clampQuantity(0, 4)).toBe(1);
    expect(clampQuantity(2, 4)).toBe(2);
  });

  it("vaut 0 quand plus rien n'est possible", () => {
    expect(clampQuantity(2, 0)).toBe(0);
  });
});

describe("showCartBar", () => {
  it("montre la barre dans la boutique, pas sur la commande", () => {
    expect(showCartBar("/produits/iphone-17-pro-max")).toBe(true);
    expect(showCartBar("/boutique")).toBe(true);
    expect(showCartBar("/commande")).toBe(false);
    expect(showCartBar("/commande/confirmation")).toBe(false);
  });
});
