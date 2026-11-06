import { warrantyRange } from "@/config/warranty";
import { formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/types/api";
import { colorHref, kindIcon, ofColor } from "./colors";
import { conditionSummary } from "./stock";

// L'affiche de choix (05/11) : l'étape Couleur puis Neuf scellé / Affaire, au style de
// l'affiche de la série. Une colonne par choix, sur la lueur de sa couleur ; `href` null :
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

// La photo de la couleur, sinon celle du modèle, sinon l'icône de la catégorie.
function imageOf(product: Pick<ProductDetail, "colors" | "images" | "category">, color: string | null): string {
  const photo = color ? product.colors.find((item) => item.name === color)?.photoUrl : null;
  return photo ?? product.images[0]?.url ?? kindIcon(product.category.kind);
}

export function colorColumns(product: ProductDetail): ChoiceColumnData[] {
  return product.colors.map(({ name }) => {
    const inStock = ofColor(product.variants, name).filter((variant) => variant.stock > 0);
    const newFrom = lowest(inStock.filter((v) => v.condition === "new").map((v) => v.price));
    const dealFrom = lowest(inStock.filter((v) => v.condition === "refurbished").map((v) => v.price));
    const from = lowest(inStock.map((v) => v.price));
    const lines = [
      ...(newFrom !== null ? [`Neuf scellé dès ${formatPrice(newFrom)}`] : []),
      ...(dealFrom !== null ? [`Affaire dès ${formatPrice(dealFrom)}`] : []),
    ];
    return {
      key: name,
      title: name,
      image: imageOf(product, name),
      glow: name,
      badge: null,
      subtitle: null,
      lines: lines.length > 0 ? lines : ["Indisponible"],
      // Les prix « dès » sont dans les lignes (neuf, affaire) : pas de prix en double.
      price: null,
      href: from !== null ? colorHref(product.slug, name) : null,
    };
  });
}

export function conditionColumns(product: ProductDetail, color: string | null): ChoiceColumnData[] {
  const variants = color ? ofColor(product.variants, color) : product.variants;
  const summary = conditionSummary(variants);
  const fresh = variants.filter((v) => v.condition === "new");
  const deals = variants.filter((v) => v.condition === "refurbished");
  const newPrices = new Set(fresh.filter((v) => v.stock > 0).map((v) => v.price));
  const href = (step: "neuf" | "affaire") => (color ? colorHref(product.slug, color, step) : `/produits/${product.slug}/${step}`);
  const common = { image: imageOf(product, color), glow: color ?? product.posterColor, subtitle: null };
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
        summary.refurbishedFrom !== null ? [`${n} appareil${n > 1 ? "s" : ""}`, ...warranty(deals)] : ["Aucune affaire en stock"],
      href: summary.refurbishedFrom !== null ? href("affaire") : null,
    },
  ];
}
