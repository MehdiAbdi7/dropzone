// Les tailles des tuiles de catégories et de marques (11/11), sans React. Rien n'est écrit en
// dur pour un nombre précis de catégories : le gérant peut en ajouter, la grille s'adapte.

// `full` : toute la largeur (une seule catégorie) ; `big` : la catégorie mise en avant (2×2 sur
// ordinateur, toute la largeur sur téléphone) ; `wide` : deux colonnes ; `tile` : une case.
export type TileSize = "full" | "big" | "wide" | "tile";

// Les tailles des tuiles de l'accueil, dans l'ordre d'affichage : la première est la catégorie mise
// en avant. La grille a 4 colonnes sur ordinateur (`columns` = 4) et 2 sur téléphone (2).
//
// Sur 4 colonnes, la grande tuile prend 4 cases (2×2) et chaque autre une case. Pour qu'aucun
// trou ne reste, le total doit être un multiple de 4 : il manque 0 à 3 cases, et les dernières
// tuiles s'élargissent (2 cases) pour les combler. Avec une ou deux catégories seulement, la
// règle ne tient pas (pas assez de tuiles à élargir) : elles prennent toute la largeur, ou
// deux grandes tuiles côte à côte.
export function layoutTiles(count: number, columns: 2 | 4): TileSize[] {
  if (count <= 0) {
    return [];
  }
  const others = count - 1;
  if (columns === 2) {
    // Deux par ligne : si la dernière reste seule sur sa ligne (nombre impair), elle s'élargit.
    return ["big", ...Array.from({ length: others }, (_, i): TileSize => (i === others - 1 && others % 2 === 1 ? "wide" : "tile"))];
  }
  if (count === 1) {
    return ["full"];
  }
  if (count === 2) {
    return ["big", "big"];
  }
  const missing = (4 - ((4 + others) % 4)) % 4;
  return ["big", ...Array.from({ length: others }, (_, i): TileSize => (i >= others - missing ? "wide" : "tile"))];
}

// L'accueil montre six catégories au plus ; le reste est dans la Boutique.
export const MAX_ON_HOME = 6;

// Les catégories de l'accueil : celles qui ont des produits publiés, la mise en avant d'abord,
// puis les autres dans l'ordre de l'API. `hidden` : combien restent pour la Boutique.
export function homeCategories<T extends { featured: boolean; productCount: number }>(categories: T[]): { shown: T[]; hidden: number } {
  const withProducts = categories.filter((category) => category.productCount > 0);
  const ordered = [...withProducts.filter((category) => category.featured), ...withProducts.filter((category) => !category.featured)];
  return { shown: ordered.slice(0, MAX_ON_HOME), hidden: Math.max(0, ordered.length - MAX_ON_HOME) };
}

// La catégorie que `/boutique` ouvre : la plus fournie, sans compter les vides. `sort` est stable,
// donc à égalité c'est la première de l'API.
export function defaultCategory<T extends { productCount: number }>(categories: T[]): T | undefined {
  return categories.filter((category) => category.productCount > 0).sort((a, b) => b.productCount - a.productCount)[0];
}

// La Boutique : au plus trois grandes marques, chacune avec au moins 15 % des produits de la
// catégorie (« Les plus demandées »). Les autres passent en tuiles compactes, dans l'ordre du
// back-office. Calcul en entiers : 15 produits sur 100, c'est pile 15 %.
export const MAX_MAJOR_BRANDS = 3;
const MAJOR_PERCENT = 15;

export function splitBrands<T extends { productCount: number }>(brands: T[], total: number): { majors: T[]; minors: T[] } {
  // `sort` est stable : à égalité de produits, l'ordre d'origine est gardé.
  const majors =
    total > 0
      ? [...brands]
          .sort((a, b) => b.productCount - a.productCount)
          .slice(0, MAX_MAJOR_BRANDS)
          .filter((brand) => brand.productCount * 100 >= total * MAJOR_PERCENT)
      : [];
  return { majors, minors: brands.filter((brand) => !majors.includes(brand)) };
}
