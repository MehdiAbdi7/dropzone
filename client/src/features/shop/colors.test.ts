import { describe, expect, it } from "vitest";
import type { Options, ProductDetail, Variant } from "@/types/api";
import { colorHref, kindIcon, ofColor, pickColor, productStep } from "./colors";

const variant = (
  options: Options,
  stock: number,
  price: number,
  condition: Variant["condition"] = "new",
): Variant => ({
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
// Argent sans rien (un neuf en rupture), Burgundy sans aucune variante.
const colors = [
  { name: "Noir", photoUrl: null },
  { name: "Argent", photoUrl: null },
  { name: "Glacier", photoUrl: "https://x/glacier.webp" },
  { name: "Burgundy", photoUrl: null },
];
const variants = [
  variant({ Stockage: "256 Go", Couleur: "Glacier" }, 2, 280000),
  variant({ Stockage: "256 Go", Couleur: "Glacier" }, 1, 248000, "refurbished"),
  variant({ Stockage: "256 Go", Couleur: "Noir" }, 1, 265000),
  variant({ Stockage: "512 Go", Couleur: "Noir" }, 0, 240000),
  variant({ Stockage: "256 Go", Couleur: "Argent" }, 0, 280000),
];

describe("ofColor", () => {
  it("garde les variantes d'une couleur", () => {
    expect(ofColor(variants, "Glacier").map((v) => v.price)).toEqual([
      280000, 248000,
    ]);
  });
});

describe("pickColor", () => {
  it("lit une couleur du modèle, avec espace ou parenthèses", () => {
    const named = [
      ...colors,
      { name: "Orange cosmique", photoUrl: null },
      { name: "(PRODUCT)RED", photoUrl: null },
    ];
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
    expect(colorHref("iphone-18-pro", "Glacier")).toBe(
      "/produits/iphone-18-pro?couleur=Glacier",
    );
    expect(colorHref("iphone-17-pro", "Orange cosmique", "neuf")).toBe(
      "/produits/iphone-17-pro/neuf?couleur=Orange%20cosmique",
    );
    expect(colorHref("iphone-8", "(PRODUCT)RED", "affaire")).toBe(
      "/produits/iphone-8/affaire?couleur=(PRODUCT)RED",
    );
  });
});

describe("productStep", () => {
  const product = (kind: ProductDetail["category"]["kind"], names: string[]) =>
    ({
      category: { name: "x", slug: "x", kind },
      colors: names.map((name) => ({ name, photoUrl: null })),
    }) as ProductDetail;

  it("montre les couleurs d'un appareil sans couleur choisie", () => {
    expect(
      productStep(product("phone", ["Noir", "Glacier"]), undefined),
    ).toEqual({ kind: "colors" });
  });

  it("passe à Neuf ou Affaire avec une couleur du modèle", () => {
    expect(
      productStep(product("phone", ["Noir", "Glacier"]), "Glacier"),
    ).toEqual({ kind: "conditions", color: "Glacier" });
  });

  it("revient aux couleurs avec une couleur inconnue", () => {
    expect(productStep(product("laptop", ["Argent"]), "Violet")).toEqual({
      kind: "colors",
    });
  });

  it("garde l'étape d'un modèle à une seule couleur", () => {
    expect(productStep(product("laptop", ["Argent"]), undefined)).toEqual({
      kind: "colors",
    });
  });

  it("saute l'étape d'un modèle sans couleurs et d'un accessoire", () => {
    expect(productStep(product("phone", []), undefined)).toEqual({
      kind: "conditions",
      color: null,
    });
    expect(productStep(product("accessory", ["Noir"]), "Noir")).toEqual({
      kind: "conditions",
      color: null,
    });
  });
});

describe("kindIcon", () => {
  it("donne l'icône de la catégorie", () => {
    expect(kindIcon("phone")).toBe("/products/phone.svg");
    expect(kindIcon("laptop")).toBe("/products/laptop.svg");
  });
});
