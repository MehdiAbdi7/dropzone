// La visionneuse de couleurs (25/11), sans React : toutes les couleurs d'un modèle avec leur stock dans
// chaque état, le texte de disponibilité et la couleur à afficher. Le composant (ColorViewer) ne fait
// que les montrer. Une couleur indisponible n'est pas retirée : la visionneuse est une référence, on
// doit pouvoir voir le modèle dans toutes ses couleurs, achetables ou non.
import { CONDITION_LABELS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductDetail, Variant } from "@/types/api";
import { colorHref, ofColor } from "./colors";
import type { JourneyCondition } from "./journey";

// Ce qui est en stock dans un état : le nombre d'appareils (une occasion est une pièce unique), le
// nombre d'exemplaires (un neuf) et le prix le plus bas.
export type ViewerStock = { count: number; stock: number; from: number };

export type ViewerColor = {
  name: string;
  photoUrl: string | null;
  new: ViewerStock | null;
  refurbished: ViewerStock | null;
};

const CONDITIONS: JourneyCondition[] = ["new", "refurbished"];

// Une entrée par couleur du modèle, dans l'ordre. Une variante en rupture ne compte pas.
export function viewerColors(product: ProductDetail): ViewerColor[] {
  return product.colors.map((color) => {
    const stockOf = (condition: JourneyCondition): ViewerStock | null => {
      const inStock = ofColor(product.variants, color.name).filter(
        (variant) => variant.condition === condition && variant.stock > 0,
      );
      if (inStock.length === 0) {
        return null;
      }
      return {
        count: inStock.length,
        stock: inStock.reduce((sum, variant) => sum + variant.stock, 0),
        from: Math.min(...inStock.map((variant) => variant.price)),
      };
    };
    return { name: color.name, photoUrl: color.photoUrl, new: stockOf("new"), refurbished: stockOf("refurbished") };
  });
}

// Dans l'état demandé ; sans état connu (entrée de référence), dans au moins un des deux.
export function isAvailable(color: ViewerColor, condition: JourneyCondition | null): boolean {
  return condition ? color[condition] !== null : color.new !== null || color.refurbished !== null;
}

export type AvailabilityLine = {
  condition: JourneyCondition;
  label: string;
  available: boolean;
  text: string;
  // La fiche finale de cette couleur dans cet état ; null quand elle n'est pas disponible.
  href: string | null;
};

// Une ligne par état : une seule quand l'état est connu, deux (Neuf puis Occasion) sinon.
export function availabilityLines(slug: string, color: ViewerColor, condition: JourneyCondition | null): AvailabilityLine[] {
  return (condition ? [condition] : CONDITIONS).map((one) => {
    const stock = color[one];
    if (!stock) {
      return { condition: one, label: CONDITION_LABELS[one], available: false, text: "Pas disponible pour le moment", href: null };
    }
    const amount = one === "new" ? `${stock.stock} en stock` : `${stock.count} appareil${stock.count > 1 ? "s" : ""}`;
    return {
      condition: one,
      label: CONDITION_LABELS[one],
      available: true,
      text: `${amount} · dès ${formatPrice(stock.from)}`,
      href: colorHref(slug, color.name, one === "new" ? "neuf" : "occasion"),
    };
  });
}

// La couleur à montrer à l'arrivée : celle de l'adresse (`?apercu=`) si elle existe, sinon la première
// couleur disponible, sinon la première.
export function firstIndex(
  colors: ViewerColor[],
  condition: JourneyCondition | null,
  param: string | string[] | undefined,
): number {
  const wanted = Array.isArray(param) ? param[0] : param;
  const asked = colors.findIndex((color) => color.name === wanted);
  if (asked >= 0) {
    return asked;
  }
  const available = colors.findIndex((color) => isAvailable(color, condition));
  return available >= 0 ? available : 0;
}

// La couleur suivante ou précédente, en boucle (la dernière revient à la première).
export function wrapIndex(count: number, index: number, delta: number): number {
  if (count <= 0) {
    return 0;
  }
  return (((index + delta) % count) + count) % count;
}

// Les couleurs disponibles autres que celle qu'on regarde : proposées quand elle ne l'est pas.
export function alternatives(
  colors: ViewerColor[],
  condition: JourneyCondition | null,
  except: number,
): { name: string; index: number }[] {
  return colors.flatMap((color, index) => (index !== except && isAvailable(color, condition) ? [{ name: color.name, index }] : []));
}

// Le mode offres (25/11, demande de Mehdi) : au clic sur « Voir les offres », la partie droite de la
// visionneuse montre ce que montrait la page suivante, sans changer de page.

// Ce que la visionneuse peut acheter pour cette couleur dans cet état : les variantes en stock.
// Vide = la couleur n'a rien à montrer dans cet état (le mode offres ne s'ouvre pas).
export function offerVariants(product: ProductDetail, colorName: string, condition: JourneyCondition): Variant[] {
  return ofColor(product.variants, colorName).filter((variant) => variant.condition === condition && variant.stock > 0);
}

// Les paramètres de l'adresse que lit la visionneuse : `apercu` (couleur à regarder), `couleur` (offres
// ouvertes sur cette couleur) et `etat` (neuf ou occasion, seulement sur la page de référence).
export type ViewerParams = {
  preview?: string | string[];
  couleur?: string | string[];
  etat?: string | string[];
};

const first = (param: string | string[] | undefined) => (Array.isArray(param) ? param[0] : param);

// Où la visionneuse démarre : sur les offres d'une couleur si l'adresse le demande et qu'il y a de quoi les
// montrer (un lien périmé, une couleur vendue entre-temps : retour au mode couleurs, jamais une page vide).
// L'état de la page l'emporte sur `etat`, qui ne sert qu'à la page de référence.
export function startView(
  product: ProductDetail,
  colors: ViewerColor[],
  condition: JourneyCondition | null,
  params: ViewerParams,
): { index: number; offers: JourneyCondition | null } {
  const etat = first(params.etat);
  const shown = condition ?? (etat === "neuf" ? "new" : etat === "occasion" ? "refurbished" : null);
  const asked = colors.findIndex((color) => color.name === first(params.couleur));
  if (shown && asked >= 0 && offerVariants(product, colors[asked].name, shown).length > 0) {
    return { index: asked, offers: shown };
  }
  return { index: firstIndex(colors, condition, params.preview), offers: null };
}

// La requête de l'adresse (sans `?`) après un changement : offres ouvertes (`couleur`, et `etat` quand la
// page ne connaît pas l'état) ou retour aux couleurs (`apercu`). Les autres paramètres sont gardés.
export function viewerSearch(
  current: string,
  colorName: string,
  offers: JourneyCondition | null,
  condition: JourneyCondition | null,
): string {
  const query = new URLSearchParams(current);
  query.delete("apercu");
  query.delete("couleur");
  query.delete("etat");
  if (offers) {
    query.set("couleur", colorName);
    if (condition === null) {
      query.set("etat", offers === "new" ? "neuf" : "occasion");
    }
  } else {
    query.set("apercu", colorName);
  }
  return query.toString();
}
