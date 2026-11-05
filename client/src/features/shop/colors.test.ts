import { describe, expect, it } from "vitest";
import type { Options, Variant } from "@/types/api";
import { colorHref, colorTiles, ofColor, pickColor } from "./colors";

const variant = (options: Options, stock: number, price: number, condition: Variant["condition"] = "new"): Variant => ({
  sku: `${options.Couleur}-${options.Stockage}-${price}-${condition}`,
  options,
  price,
  stock,
  condition,
  grade: condition === "new" ? null : 8,
  batteryHealth: condition === "new" ? null : 91,
  replacedParts: [],
  compatibleParts: [],
  defects: [],
  limitations: [],
  withBox: condition === "new" ? null : false,
  details: null,
  gifts: [],
});

// L'iPhone 18 Pro de la maquette : Glacier en neuf et en affaire, Noir en neuf seulement,
// Argent sans rien (un neuf en rupture), Bordeaux sans aucune variante.
const colors = [
  { name: "Noir", photoUrl: null },
  { name: "Argent", photoUrl: null },
  { name: "Glacier", photoUrl: "https://x/glacier.webp" },
  { name: "Bordeaux", photoUrl: null },
];
const variants = [
  variant({ Stockage: "256 Go", Couleur: "Glacier" }, 2, 280000),
  variant({ Stockage: "256 Go", Couleur: "Glacier" }, 1, 248000, "refurbished"),
  variant({ Stockage: "256 Go", Couleur: "Noir" }, 1, 265000),
  variant({ Stockage: "512 Go", Couleur: "Noir" }, 0, 240000),
  variant({ Stockage: "256 Go", Couleur: "Argent" }, 0, 280000),
];

describe("colorTiles", () => {
  it("donne une tuile par couleur, dans l'ordre du modèle", () => {
    expect(colorTiles(colors, variants).map((tile) => tile.name)).toEqual(["Noir", "Argent", "Glacier", "Bordeaux"]);
  });

  it("prend le prix le plus bas parmi le neuf et les affaires en stock", () => {
    expect(colorTiles(colors, variants)[2]).toEqual({
      name: "Glacier",
      photoUrl: "https://x/glacier.webp",
      fromPrice: 248000,
      available: true,
    });
  });

  it("ignore un neuf en rupture pour le prix comme pour la disponibilité", () => {
    const [noir, argent] = colorTiles(colors, variants);
    expect(noir).toMatchObject({ fromPrice: 265000, available: true });
    expect(argent).toMatchObject({ fromPrice: null, available: false });
  });

  it("rend indisponible une couleur sans aucune variante", () => {
    expect(colorTiles(colors, variants)[3]).toMatchObject({ fromPrice: null, available: false });
  });
});

describe("ofColor", () => {
  it("garde les variantes d'une couleur", () => {
    expect(ofColor(variants, "Glacier").map((v) => v.price)).toEqual([280000, 248000]);
  });
});

describe("pickColor", () => {
  it("lit une couleur du modèle, avec espace ou parenthèses", () => {
    const named = [...colors, { name: "Orange cosmique", photoUrl: null }, { name: "(PRODUCT)RED", photoUrl: null }];
    expect(pickColor(named, "Orange cosmique")).toBe("Orange cosmique");
    expect(pickColor(named, "(PRODUCT)RED")).toBe("(PRODUCT)RED");
  });

  it("refuse une couleur inconnue, un tableau ou rien", () => {
    expect(pickColor(colors, "Violet")).toBeNull();
    expect(pickColor(colors, ["Noir", "Argent"])).toBeNull();
    expect(pickColor(colors, undefined)).toBeNull();
  });
});

describe("colorHref", () => {
  it("encode la couleur dans l'adresse", () => {
    expect(colorHref("iphone-18-pro", "Glacier")).toBe("/produits/iphone-18-pro?couleur=Glacier");
    expect(colorHref("iphone-17-pro", "Orange cosmique", "neuf")).toBe("/produits/iphone-17-pro/neuf?couleur=Orange%20cosmique");
    expect(colorHref("iphone-8", "(PRODUCT)RED", "affaire")).toBe("/produits/iphone-8/affaire?couleur=(PRODUCT)RED");
  });
});
