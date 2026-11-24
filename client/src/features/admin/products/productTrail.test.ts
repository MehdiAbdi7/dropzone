import { describe, expect, it } from "vitest";
import { selectionTrail, productTrail } from "./productTrail";

// Le chemin d'un produit sous le titre de sa fiche (24/11, demande de Mehdi : la catégorie et le modèle se choisissent
// avant la fiche, ils s'y lisent comme un chemin cliquable, ils n'y sont plus une tuile).
const iphone18Pro = {
  category: { id: 1, name: "Smartphones", kind: "phone" as const },
  brand: { id: 4, name: "iPhone" },
  maker: null,
  deviceModel: { id: 38, brand: "Apple", name: "iPhone 18 Pro", series: { id: 11, name: "iPhone 18" } },
};

describe("productTrail", () => {
  it("un appareil : Catalogue, catégorie, marque, série, puis le modèle, sans lien (c'est la page)", () => {
    expect(productTrail(iphone18Pro)).toEqual([
      { label: "Catalogue", href: "/admin/catalogue" },
      { label: "Smartphones", href: "/admin/catalogue/1" },
      { label: "iPhone", href: "/admin/catalogue/marques/4" },
      { label: "iPhone 18", href: "/admin/catalogue/series/11" },
      { label: "iPhone 18 Pro" },
    ]);
  });

  it("un modèle sans série saute la série", () => {
    expect(productTrail({ ...iphone18Pro, deviceModel: { ...iphone18Pro.deviceModel, series: null } }).map((crumb) => crumb.label)).toEqual([
      "Catalogue",
      "Smartphones",
      "iPhone",
      "iPhone 18 Pro",
    ]);
  });

  it("un appareil sans marque garde l'essentiel", () => {
    expect(productTrail({ ...iphone18Pro, brand: null }).map((crumb) => crumb.label)).toEqual([
      "Catalogue",
      "Smartphones",
      "iPhone 18",
      "iPhone 18 Pro",
    ]);
  });

  it("un accessoire : Catalogue, catégorie, type, puis sa marque", () => {
    const charger = {
      category: { id: 2, name: "Accessoires", kind: "accessory" as const },
      brand: { id: 9, name: "Chargeurs" },
      maker: { id: 3, name: "Anker" },
      deviceModel: null,
    };
    expect(productTrail(charger)).toEqual([
      { label: "Catalogue", href: "/admin/catalogue" },
      { label: "Accessoires", href: "/admin/catalogue/2" },
      { label: "Chargeurs", href: "/admin/catalogue/types/9" },
      { label: "Anker" },
    ]);
  });

  it("un accessoire sans marque finit sur son type", () => {
    const labels = productTrail({
      category: { id: 2, name: "Accessoires", kind: "accessory" },
      brand: { id: 9, name: "Chargeurs" },
      maker: null,
      deviceModel: null,
    }).map((crumb) => crumb.label);
    expect(labels).toEqual(["Catalogue", "Accessoires", "Chargeurs"]);
  });
});

describe("selectionTrail", () => {
  it("à la création, le choix en cours : des noms sans lien, les morceaux choisis seulement", () => {
    expect(selectionTrail({ category: "Smartphones", brand: "iPhone", last: "iPhone 18 Pro" })).toEqual([
      { label: "Catalogue", href: "/admin/catalogue" },
      { label: "Smartphones" },
      { label: "iPhone" },
      { label: "iPhone 18 Pro" },
    ]);
    expect(selectionTrail({ category: "Smartphones", brand: null, last: null }).map((crumb) => crumb.label)).toEqual(["Catalogue", "Smartphones"]);
  });
});
