import { DEVICE_KINDS } from "@/config/catalog";
import type { ProductDetail, ProductKind, Variant } from "@/types/api";

// L'étape Couleur (05/11), sans React : la couleur dans l'adresse et les variantes d'une
// couleur. Les colonnes de l'affiche sont dans choiceColumns.ts.

export function ofColor(variants: Variant[], color: string): Variant[] {
  return variants.filter((variant) => variant.options.Couleur === color);
}

// La couleur de l'adresse (`?couleur=`), si c'est une couleur du modèle ; sinon null.
export function pickColor(colors: ProductDetail["colors"], param: string | string[] | undefined): string | null {
  if (typeof param !== "string") {
    return null;
  }
  return colors.some((color) => color.name === param) ? param : null;
}

export function colorHref(slug: string, color: string, step?: "neuf" | "occasion"): string {
  return `/produits/${slug}${step ? `/${step}` : ""}?couleur=${encodeURIComponent(color)}`;
}

// L'étape Couleur des pages Neuf et Occasion (23/11 : le client choisit d'abord Neuf scellé ou Occasion, sur la page
// du modèle). Un appareil qui a des couleurs passe par l'étape Couleur (même avec une seule couleur, comme Neuf /
// Occasion qu'on ne saute jamais) ; une couleur valide dans l'adresse passe aux appareils de cette couleur. Un modèle
// sans couleurs et un accessoire vont directement à la suite.
export function productStep(
  product: Pick<ProductDetail, "category" | "colors">,
  couleur: string | string[] | undefined,
): { kind: "colors" } | { kind: "conditions"; color: string | null } {
  if (!DEVICE_KINDS.includes(product.category.kind) || product.colors.length === 0) {
    return { kind: "conditions", color: null };
  }
  const color = pickColor(product.colors, couleur);
  return color ? { kind: "conditions", color } : { kind: "colors" };
}

// L'icône de la catégorie, quand une couleur n'a pas encore sa photo (décision de Mehdi).
export function kindIcon(kind: ProductKind): string {
  return `/products/${kind}.svg`;
}
