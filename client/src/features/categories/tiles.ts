// Les règles de l'accueil et de la Boutique pour les catégories, sans React. Rien n'est écrit en
// dur pour un nombre précis de catégories : le gérant peut en ajouter, tout vient de l'API.

// Les catégories de l'accueil : celles qui ont des produits publiés, la mise en avant d'abord,
// puis les autres dans l'ordre de l'API. Le carrousel les montre toutes : il défile, donc il n'y a
// pas de place à gagner (refonte du 11/11 au soir : la grille à tailles variables a disparu).
export function homeCategories<T extends { featured: boolean; productCount: number }>(categories: T[]): T[] {
  const withProducts = categories.filter((category) => category.productCount > 0);
  return [...withProducts.filter((category) => category.featured), ...withProducts.filter((category) => !category.featured)];
}

// La catégorie et la marque d'une adresse de la Boutique : `/boutique/<catégorie>` ou
// `/boutique/<catégorie>/<marque>`, rien d'autre (une série a trois parties).
function browsePath(pathname: string | null): { category: string; brand: string | null } | null {
  const match = pathname?.match(/^\/boutique\/([^/]+)(?:\/([^/]+))?\/?$/);
  return match ? { category: match[1], brand: match[2] ?? null } : null;
}

// La marque affichée par la page des séries (refonte du 12/11) : elle se relit dans l'adresse,
// que le clic sur une puce change sans recharger (`/boutique/smartphones/samsung`). Le bouton
// « précédent » du navigateur ramène ainsi à la marque d'avant. null : pas de marque dans
// l'adresse, ou une adresse d'une autre catégorie.
export function brandSlugFromPath(pathname: string | null, categorySlug: string): string | null {
  const path = browsePath(pathname);
  return path && path.category === categorySlug ? path.brand : null;
}

// Le groupe de séries à montrer : celui de la marque demandée, sinon le premier (une marque
// épuisée ou inconnue n'a pas de groupe, la page ouvre la première).
export function pickBrand<T extends { brand: { slug: string } }>(groups: T[], slug: string | null): T | undefined {
  return groups.find((group) => group.brand.slug === slug) ?? groups[0];
}

// Passer d'une marque à une autre, ou de la catégorie à une de ses marques, ne change pas de
// page : seules les séries changent. La transition de page (glissement) n'a donc pas lieu d'être ;
// elle se joue pour tout autre changement d'adresse (une autre catégorie, une série, un produit).
export function isBrowseSwitch(from: string | null, to: string | null): boolean {
  const [a, b] = [browsePath(from), browsePath(to)];
  return a !== null && b !== null && a.category === b.category && from !== to;
}
