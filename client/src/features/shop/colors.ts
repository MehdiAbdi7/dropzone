import type { ProductDetail, Variant } from "@/types/api";

// L'étape Couleur (05/11), sans React : entre le modèle et Neuf scellé / Affaire, une tuile
// par couleur du modèle. Une couleur sans rien en stock reste à sa place, barrée.

export type ColorTile = {
  name: string;
  photoUrl: string | null;
  // Le plus bas parmi le neuf scellé et les affaires en stock dans cette couleur.
  fromPrice: number | null;
  available: boolean;
};

export function ofColor(variants: Variant[], color: string): Variant[] {
  return variants.filter((variant) => variant.options.Couleur === color);
}

export function colorTiles(colors: ProductDetail["colors"], variants: Variant[]): ColorTile[] {
  return colors.map(({ name, photoUrl }) => {
    // L'API ne renvoie pas les affaires vendues ; un neuf en rupture revient avec stock 0.
    const inStock = ofColor(variants, name).filter((variant) => variant.stock > 0);
    return {
      name,
      photoUrl,
      fromPrice: inStock.length > 0 ? Math.min(...inStock.map((variant) => variant.price)) : null,
      available: inStock.length > 0,
    };
  });
}

// La couleur de l'adresse (`?couleur=`), si c'est une couleur du modèle ; sinon null.
export function pickColor(colors: ProductDetail["colors"], param: string | string[] | undefined): string | null {
  if (typeof param !== "string") {
    return null;
  }
  return colors.some((color) => color.name === param) ? param : null;
}

export function colorHref(slug: string, color: string, step?: "neuf" | "affaire"): string {
  return `/produits/${slug}${step ? `/${step}` : ""}?couleur=${encodeURIComponent(color)}`;
}
