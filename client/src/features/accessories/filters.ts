// Les filtres de la page Accessoires (refonte du 12/11), sans React : le type (Chargeurs,
// Coques…) et la marque du type (Anker…), lus et écrits dans l'adresse pour qu'un lien copié
// rouvre le même filtre. Tout vient du catalogue de l'API : rien n'est écrit pour un type précis.
import type { AccessoryCatalog, AccessoryItem } from "@/types/api";

export type AccessoryFilters = { type: string | null; maker: string | null };

// Le filtre de l'adresse (`?type=coques&marque=samsung`). Un type inconnu du catalogue, ou une
// marque que le type n'a pas, est ramené à « Tous » ou « Toutes » : jamais de page vide.
export function readFilters(params: URLSearchParams, catalog: AccessoryCatalog): AccessoryFilters {
  const type = catalog.types.find((one) => one.slug === params.get("type"));
  if (!type) {
    return { type: null, maker: null };
  }
  const maker = type.makers.find((one) => one.slug === params.get("marque"));
  return { type: type.slug, maker: maker?.slug ?? null };
}

export function filtersHref(categorySlug: string, filters: AccessoryFilters): string {
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.type && filters.maker) params.set("marque", filters.maker);
  const query = params.toString();
  return `/boutique/${categorySlug}${query ? `?${query}` : ""}`;
}

export function visibleProducts(catalog: AccessoryCatalog, filters: AccessoryFilters): AccessoryItem[] {
  return catalog.products.filter(
    (product) =>
      (!filters.type || product.type === filters.type) && (!filters.maker || product.maker?.slug === filters.maker),
  );
}

// Les marques du filtre « Marque » : celles du type choisi. Aucune sur « Tous », ni pour un type
// sans marque (les verres incassables) : la rangée n'est alors pas affichée.
export function makersOf(catalog: AccessoryCatalog, type: string | null) {
  return catalog.types.find((one) => one.slug === type)?.makers ?? [];
}

// « 25 W » et « 45 W » donnent « 25 ou 45 W » ; sans unité commune, les valeurs entières.
function joinValues(values: string[], word: (first: string, last: string) => string): string {
  const [first, last] = [values[0], values[values.length - 1]];
  const unit = (value: string) => value.match(/^[\d,.]+ (.+)$/)?.[1];
  if (unit(first) && unit(first) === unit(last)) {
    return `${word(first.split(" ")[0], last.split(" ")[0])} ${unit(first)}`;
  }
  return word(first, last);
}

// La petite ligne de la carte, sous le nom : ce qu'on choisira dans la fenêtre.
export function accessoryHint(item: AccessoryItem): string {
  const sizes = item.options["Taille de l'écran"];
  if (sizes) {
    return `${sizes.length} tailles d'écran`;
  }
  const models = item.options["Modèle"];
  if (models) {
    return `${models.length} modèle${models.length > 1 ? "s" : ""}`;
  }
  const keys = Object.keys(item.options);
  if (keys.length > 1) {
    return `${keys.map((key, index) => (index === 0 ? key : key.toLowerCase())).join(" et ")} au choix`;
  }
  const values = keys.length ? item.options[keys[0]] : [];
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return joinValues(values, (a, b) => `${a} ou ${b}`);
  return joinValues(values, (a, b) => `De ${a} à ${b}`);
}
