// Les règles de l'accueil et de la Boutique pour les catégories, sans React. Rien n'est écrit en
// dur pour un nombre précis de catégories : le gérant peut en ajouter, tout vient de l'API.

// Les catégories de l'accueil : celles qui ont des produits publiés, la mise en avant d'abord,
// puis les autres dans l'ordre de l'API. Le carrousel les montre toutes : il défile, donc il n'y a
// pas de place à gagner (refonte du 11/11 au soir : la grille à tailles variables a disparu).
export function homeCategories<T extends { featured: boolean; productCount: number }>(categories: T[]): T[] {
  const withProducts = categories.filter((category) => category.productCount > 0);
  return [...withProducts.filter((category) => category.featured), ...withProducts.filter((category) => !category.featured)];
}

// La catégorie que `/boutique` ouvre : la plus fournie, sans compter les vides. `sort` est stable,
// donc à égalité c'est la première de l'API.
export function defaultCategory<T extends { productCount: number }>(categories: T[]): T | undefined {
  return categories.filter((category) => category.productCount > 0).sort((a, b) => b.productCount - a.productCount)[0];
}

// La Boutique change de catégorie sans recharger la page, puis met l'adresse à jour
// (`/boutique/tablettes`). Pour que le bouton « précédent » du navigateur marche, la catégorie
// affichée se relit dans l'adresse : `/boutique/<catégorie>` et rien d'autre. Une page de marque
// (`/boutique/smartphones/iphone`) ou toute autre page ne donne aucune catégorie.
export function categorySlugFromPath(pathname: string | null): string | null {
  const match = pathname?.match(/^\/boutique\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

// Passer d'une catégorie à une autre sur la Boutique ne change pas de page : seules les marques
// changent. La transition de page (glissement) n'a donc pas lieu d'être ; elle se joue pour tout
// autre changement d'adresse. Vrai quand les deux adresses sont des pages de catégorie.
export function isCategorySwitch(from: string | null, to: string | null): boolean {
  return categorySlugFromPath(from) !== null && categorySlugFromPath(to) !== null;
}
