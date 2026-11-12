import type { Options } from "@/types/api";

// Les petits calculs des affiches d'accessoires (12/11), sans React : testés avec Vitest.
// Une affiche = un produit, une colonne = une de ses variantes neuves.

// L'ordre où on dit les options d'un accessoire : « iPhone 17 Pro Max · Noir », « 45 W · USB-C ».
// PostgreSQL range les clés d'un JSONB par longueur (« Câble » avant « Puissance »), d'où cet ordre
// écrit ici ; une option inconnue passe après, par ordre alphabétique.
const OPTION_ORDER = ["Modèle", "Puissance", "Longueur", "Courant", "Câble", "Couleur"];

export function variantLabel(options: Options): string {
  const rank = (key: string) => (OPTION_ORDER.includes(key) ? OPTION_ORDER.indexOf(key) : OPTION_ORDER.length);
  const values = Object.keys(options)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "fr"))
    .map((key) => options[key]);
  return values.length > 0 ? values.join(" · ") : "Standard";
}

// Les noms des colonnes d'une affiche : uniques (ils servent de clé et de puces de navigation), donc
// deux variantes qui diraient la même chose reçoivent un numéro.
export function columnLabels(variants: { options: Options }[]): string[] {
  const seen = new Map<string, number>();
  return variants.map(({ options }) => {
    const label = variantLabel(options);
    const count = (seen.get(label) ?? 0) + 1;
    seen.set(label, count);
    return count === 1 ? label : `${label} (${count})`;
  });
}

// La fiche du produit, avec les options de la colonne : la fiche les choisit d'avance.
export function variantHref(slug: string, options: Options): string {
  const query = Object.entries(options)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `/produits/${slug}?${query}` : `/produits/${slug}`;
}

// Le mot sous une colonne grisée : la variante existe mais n'a plus de stock.
export function columnStatus(stock: number): string | null {
  return stock === 0 ? "Épuisé" : null;
}

export function posterSubtitle(count: number): string {
  return `${count} référence${count > 1 ? "s" : ""}`;
}
