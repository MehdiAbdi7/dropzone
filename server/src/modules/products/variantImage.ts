import { sameColor } from "../models/modelColors.js";

// La photo d'une variante au comptoir : celle de SA couleur si le modèle en a une (la même règle que le
// panier et les commandes), sinon la première photo du produit. Sans elle, le vendeur voyait la même
// photo pour toutes les couleurs d'un iPhone.
export function variantImage(
  options: unknown,
  colorPhotos: { color: string; url: string }[],
  productImage: string | null,
): string | null {
  const color = (options as Record<string, string> | null)?.Couleur;
  const photo = color ? colorPhotos.find((item) => sameColor(item.color, color))?.url : undefined;
  return photo ?? productImage;
}
