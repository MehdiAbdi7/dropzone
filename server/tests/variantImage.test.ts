import { describe, expect, it } from "vitest";
import { variantImage } from "../src/modules/products/variantImage.js";

// La photo d'une variante au comptoir : celle de SA couleur si le modèle en a une (comme la boutique),
// sinon la première photo du produit.
const photos = [
  { color: "Glacier", url: "https://img/glacier.webp" },
  { color: "Noir", url: "https://img/noir.webp" },
];

describe("variantImage", () => {
  it("prend la photo de la couleur de la variante", () => {
    expect(variantImage({ Couleur: "Glacier" }, photos, "https://img/produit.webp")).toBe("https://img/glacier.webp");
  });
  it("ignore la casse et les espaces autour de la couleur", () => {
    expect(variantImage({ Couleur: " noir " }, photos, null)).toBe("https://img/noir.webp");
  });
  it("retombe sur la photo du produit sans photo de couleur ou sans couleur", () => {
    expect(variantImage({ Couleur: "Rose" }, photos, "https://img/produit.webp")).toBe("https://img/produit.webp");
    expect(variantImage({ Stockage: "256 Go" }, photos, "https://img/produit.webp")).toBe("https://img/produit.webp");
    expect(variantImage(null, [], null)).toBeNull();
  });
});
