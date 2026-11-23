import { warrantyRange } from "@/config/warranty";
import { formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/types/api";
import { colorHref, kindIcon, ofColor } from "./colors";
import { conditionSummary } from "./stock";

// L'affiche de choix (05/11, ordre inversé le 23/11) : Neuf scellé ou Occasion d'abord, puis la couleur pour le neuf
// seulement, au style de l'affiche de la série. Une colonne par choix, sur la lueur de sa couleur ; `href` null :
// la colonne est grisée, barrée, sans lien (rien en stock).
export type ChoiceColumnData = {
  key: string;
  title: string;
  image: string;
  // Un nom de couleur (sa teinte vient de la palette), null = lueur neutre.
  glow: string | null;
  badge: "new" | "deal" | null;
  subtitle: string | null;
  lines: string[];
  price: { prefix: string; value: number } | null;
  href: string | null;
};

const lowest = (prices: number[]) => (prices.length > 0 ? Math.min(...prices) : null);

// Une couleur montre sa propre photo, sinon l'icône de la catégorie : la photo du modèle
// mettait la même image sur toutes les couleurs (06/11). Sans couleur choisie, la photo du
// produit.
export function imageOf(product: Pick<ProductDetail, "colors" | "images" | "category">, color: string | null): string {
  const photo = color ? product.colors.find((item) => item.name === color)?.photoUrl : product.images[0]?.url;
  return photo ?? kindIcon(product.category.kind);
}

// La photo du modèle (23/11, demande de Mehdi : sur les deux cartes Neuf scellé et Occasion) : celle du produit, sinon
// la photo de la couleur de l'affiche, sinon celle d'une autre couleur, sinon l'icône de la catégorie.
export function modelImage(product: Pick<ProductDetail, "colors" | "images" | "category" | "posterColor">): string {
  const posterPhoto = product.colors.find((item) => item.name === product.posterColor)?.photoUrl;
  const anyPhoto = product.colors.find((item) => item.photoUrl)?.photoUrl;
  return product.images[0]?.url ?? posterPhoto ?? anyPhoto ?? kindIcon(product.category.kind);
}

// L'étape Couleur, après « Neuf scellé » ou « Occasion » (23/11) : chaque couleur dit son prix « dès » et son stock
// dans cet état ; une couleur qui n'en a pas est grisée, sans lien.
export function colorColumns(product: ProductDetail, condition: "new" | "refurbished"): ChoiceColumnData[] {
  const isNew = condition === "new";
  return product.colors.map(({ name }) => {
    const inStock = ofColor(product.variants, name).filter((variant) => variant.stock > 0 && variant.condition === condition);
    const from = lowest(inStock.map((v) => v.price));
    // Une occasion est une pièce unique : on compte les appareils ; un neuf, les exemplaires en stock.
    const count = isNew ? inStock.reduce((sum, v) => sum + v.stock, 0) : inStock.length;
    const countLine = isNew ? `${count} en stock` : `${count} appareil${count > 1 ? "s" : ""}`;
    return {
      key: name,
      title: name,
      image: imageOf(product, name),
      glow: name,
      badge: null,
      subtitle: null,
      lines:
        from !== null
          ? [`${isNew ? "Neuf scellé" : "Occasion"} dès ${formatPrice(from)}`, countLine]
          : [isNew ? "Pas de neuf dans cette couleur" : "Pas d'occasion dans cette couleur"],
      // Le prix « dès » est dans les lignes : pas de prix en double.
      price: null,
      href: from !== null ? colorHref(product.slug, name, isNew ? "neuf" : "occasion") : null,
    };
  });
}

export function conditionColumns(product: ProductDetail, color: string | null): ChoiceColumnData[] {
  const variants = color ? ofColor(product.variants, color) : product.variants;
  const summary = conditionSummary(variants);
  const fresh = variants.filter((v) => v.condition === "new");
  const deals = variants.filter((v) => v.condition === "refurbished");
  const newPrices = new Set(fresh.filter((v) => v.stock > 0).map((v) => v.price));
  const href = (step: "neuf" | "occasion") => (color ? colorHref(product.slug, color, step) : `/produits/${product.slug}/${step}`);
  // Sans couleur (la première étape) : la photo du modèle ; un ancien lien avec `?couleur=` garde la photo de sa couleur.
  const common = { image: color ? imageOf(product, color) : modelImage(product), glow: color ?? product.posterColor, subtitle: null };
  const n = summary.refurbishedCount;
  const warranty = (list: typeof variants) => {
    const label = warrantyRange(list);
    return label ? [label] : [];
  };

  return [
    {
      ...common,
      key: "new",
      badge: "new",
      title: "Dans sa boîte scellée",
      price: summary.newFrom !== null ? { prefix: newPrices.size > 1 ? "À partir de " : "", value: summary.newFrom } : null,
      lines: summary.newFrom !== null ? [`${summary.newStock} en stock`, ...warranty(fresh)] : ["Aucun neuf scellé en stock"],
      href: summary.newFrom !== null ? href("neuf") : null,
    },
    {
      ...common,
      key: "deal",
      badge: "deal",
      title: "Testé et décrit pièce par pièce",
      price: summary.refurbishedFrom !== null ? { prefix: "À partir de ", value: summary.refurbishedFrom } : null,
      lines:
        summary.refurbishedFrom !== null ? [`${n} appareil${n > 1 ? "s" : ""}`, ...warranty(deals)] : ["Aucune occasion en stock"],
      href: summary.refurbishedFrom !== null ? href("occasion") : null,
    },
  ];
}
