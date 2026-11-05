import { describe, expect, it } from "vitest";
import type { CartLine, CartPreview, Variant } from "@/types/api";
import { cartBarSummary, clampQuantity, quantityLimit, showCartBar } from "./cartQuantity";

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

  it("limite une affaire à un exemplaire", () => {
    expect(quantityLimit(variant(1, "refurbished"), 0)).toBe(1);
    expect(quantityLimit(variant(1, "refurbished"), 1)).toBe(0);
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

const line = (sku: string, quantity: number, image: string | null, isGift = false): CartLine =>
  ({ sku, quantity, image, isGift, giftFor: isGift ? "IP" : null, lineTotal: isGift ? 0 : 1000 * quantity }) as CartLine;
const preview = (lines: CartLine[], total: number, unavailable: string[] = []) =>
  ({ lines, total, unavailable, notices: [], limitations: [], subtotal: total, shippingFee: 0, canOrder: true, cartHash: "" }) as CartPreview;

describe("cartBarSummary", () => {
  it("compte les articles et prend 3 vignettes, sans les articles offerts", () => {
    const summary = cartBarSummary(
      preview(
        [line("IP", 3, "a.webp"), line("CHG", 3, "c.webp", true), line("B", 1, null), line("C", 1, "c2.webp"), line("D", 2, "d.webp")],
        1056000,
      ),
    );
    expect(summary).toEqual({ count: 7, total: 1056000, thumbs: ["a.webp", "c2.webp", "d.webp"], hidden: 1 });
  });

  it("tient un panier dont tout est devenu indisponible", () => {
    expect(cartBarSummary(preview([], 0, ["IP"]))).toEqual({ count: 0, total: 0, thumbs: [], hidden: 0 });
  });
});

describe("showCartBar", () => {
  it("montre la barre dans la boutique, pas sur le panier ni la commande", () => {
    expect(showCartBar("/produits/iphone-17-pro-max")).toBe(true);
    expect(showCartBar("/boutique")).toBe(true);
    expect(showCartBar("/panier")).toBe(false);
    expect(showCartBar("/commande")).toBe(false);
    expect(showCartBar("/commande/confirmation")).toBe(false);
  });
});
