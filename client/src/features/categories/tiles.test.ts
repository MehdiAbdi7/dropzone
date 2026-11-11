import { describe, expect, it } from "vitest";
import { layoutTiles, splitBrands, type TileSize } from "./tiles";

// Les cases que prend chaque taille dans une grille de `columns` colonnes : [colonnes, lignes].
const SPAN: Record<number, Record<TileSize, [number, number]>> = {
  4: { full: [4, 2], big: [2, 2], wide: [2, 1], tile: [1, 1] },
  2: { full: [2, 1], big: [2, 1], wide: [2, 1], tile: [1, 1] },
};

// Pose les tuiles comme le fait CSS (`grid-auto-flow: row`) : chacune à la première place libre
// qui la contient, sans jamais revenir en arrière. Rend le nombre de cases vides à l'intérieur de
// la grille une fois tout posé : zéro, c'est une grille sans trou.
function holesAfterPacking(sizes: TileSize[], columns: 2 | 4): number {
  const taken = new Set<string>();
  let cursor = 0;
  let rows = 0;
  for (const size of sizes) {
    const [width, height] = SPAN[columns][size];
    for (;; cursor++) {
      const column = cursor % columns;
      const row = Math.floor(cursor / columns);
      const fits =
        column + width <= columns &&
        Array.from({ length: width * height }, (_, i) => `${row + Math.floor(i / width)}:${column + (i % width)}`).every(
          (cell) => !taken.has(cell),
        );
      if (fits) {
        for (let i = 0; i < width * height; i++) {
          taken.add(`${row + Math.floor(i / width)}:${column + (i % width)}`);
        }
        rows = Math.max(rows, row + height);
        cursor += width;
        break;
      }
    }
  }
  return rows * columns - taken.size;
}

// L'accueil (11/11) : la catégorie mise en avant prend 2×2, les autres 1×1, et les dernières
// tuiles s'élargissent pour qu'il n'y ait aucun trou, quel que soit le nombre de catégories.
describe("layoutTiles sur 4 colonnes", () => {
  it("n'a rien à poser sans catégorie", () => {
    expect(layoutTiles(0, 4)).toEqual([]);
  });

  it("donne les tailles des maquettes", () => {
    // Une seule : elle prend toute la largeur. Deux : deux grandes. Trois : la grande, puis
    // deux larges qui remplissent ses deux lignes.
    expect(layoutTiles(1, 4)).toEqual(["full"]);
    expect(layoutTiles(2, 4)).toEqual(["big", "big"]);
    expect(layoutTiles(3, 4)).toEqual(["big", "wide", "wide"]);
    // Quatre : la dernière s'élargit. Cinq : le compte tombe juste. Sept : les deux dernières.
    expect(layoutTiles(4, 4)).toEqual(["big", "tile", "tile", "wide"]);
    expect(layoutTiles(5, 4)).toEqual(["big", "tile", "tile", "tile", "tile"]);
    expect(layoutTiles(7, 4)).toEqual(["big", "tile", "tile", "tile", "tile", "wide", "wide"]);
  });

  it("ne laisse aucun trou, de 1 à 24 catégories", () => {
    for (let count = 1; count <= 24; count++) {
      expect(holesAfterPacking(layoutTiles(count, 4), 4), `${count} catégories`).toBe(0);
    }
  });

  it("met la grande en premier et ne s'élargit que par le bas", () => {
    for (let count = 2; count <= 24; count++) {
      const sizes = layoutTiles(count, 4);
      expect(sizes[0]).toMatch(/big|full/);
      expect(sizes).toHaveLength(count);
      // Toutes les larges sont à la fin, derrière les tuiles simples.
      const firstWide = sizes.indexOf("wide");
      if (firstWide !== -1 && count > 3) {
        expect(sizes.slice(firstWide).every((size) => size === "wide")).toBe(true);
      }
    }
  });
});

describe("layoutTiles sur 2 colonnes (téléphone)", () => {
  it("met la première en pleine largeur, puis deux par ligne", () => {
    expect(layoutTiles(1, 2)).toEqual(["big"]);
    expect(layoutTiles(3, 2)).toEqual(["big", "tile", "tile"]);
    expect(layoutTiles(5, 2)).toEqual(["big", "tile", "tile", "tile", "tile"]);
  });

  it("élargit la dernière quand il en reste une seule sur sa ligne", () => {
    expect(layoutTiles(2, 2)).toEqual(["big", "wide"]);
    expect(layoutTiles(4, 2)).toEqual(["big", "tile", "tile", "wide"]);
  });

  it("ne laisse aucun trou, de 1 à 24 catégories", () => {
    for (let count = 1; count <= 24; count++) {
      expect(holesAfterPacking(layoutTiles(count, 2), 2), `${count} catégories`).toBe(0);
    }
  });
});

// La Boutique (11/11) : au plus trois grandes marques, chacune avec au moins 15 % des produits de
// la catégorie. Les autres passent en tuiles compactes, dans l'ordre du back-office.
describe("splitBrands", () => {
  const brand = (name: string, productCount: number) => ({ name, productCount });

  it("sépare les grandes marques des autres, comme sur les Smartphones", () => {
    const { majors, minors } = splitBrands(
      [brand("iPhone", 30), brand("Samsung", 14), brand("Honor", 2), brand("Vivo", 1), brand("Huawei", 1)],
      48,
    );
    expect(majors.map((item) => item.name)).toEqual(["iPhone", "Samsung"]);
    expect(minors.map((item) => item.name)).toEqual(["Honor", "Vivo", "Huawei"]);
  });

  it("n'en garde que trois, les plus fournies, même si d'autres passent le seuil", () => {
    const brands = [brand("ASUS", 18), brand("HP", 28), brand("MacBook", 15), brand("Dell", 23), brand("Lenovo", 22)];
    const { majors, minors } = splitBrands(brands, 100);
    expect(majors.map((item) => item.name)).toEqual(["HP", "Dell", "Lenovo"]);
    // Les autres gardent l'ordre d'origine (celui du back-office), pas celui des comptes.
    expect(minors.map((item) => item.name)).toEqual(["ASUS", "MacBook"]);
  });

  it("applique le seuil de 15 % : 15 passe, 14 ne passe pas", () => {
    expect(splitBrands([brand("A", 15)], 100).majors).toHaveLength(1);
    expect(splitBrands([brand("A", 14)], 100).majors).toHaveLength(0);
  });

  it("n'a que des tuiles compactes quand aucune marque ne domine", () => {
    const brands = Array.from({ length: 10 }, (_, i) => brand(`M${i}`, 10));
    const { majors, minors } = splitBrands(brands, 100);
    expect(majors).toEqual([]);
    expect(minors).toHaveLength(10);
  });

  it("ne plante pas sans produit", () => {
    expect(splitBrands([], 0)).toEqual({ majors: [], minors: [] });
    expect(splitBrands([brand("A", 0)], 0).majors).toEqual([]);
  });

  it("garde l'ordre d'origine entre deux marques à égalité", () => {
    const { majors } = splitBrands([brand("B", 20), brand("A", 20)], 40);
    expect(majors.map((item) => item.name)).toEqual(["B", "A"]);
  });
});
