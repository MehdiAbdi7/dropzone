import { slugify } from "../../utils/slugify.js";

// Le slug d'un modèle, pour le filtre ?model= du catalogue.
// « Galaxy S20+ » et « Galaxy S20 » donneraient le même slug (slugify retire le +) :
// le + devient « plus ». La marque n'est pas répétée si le nom la contient déjà
// (« Apple Watch Series 9 » → apple-watch-series-9, pas apple-apple-watch-series-9).
export function modelSlug(brand: string, name: string): string {
  const full = name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
  return slugify(full.replaceAll("+", " plus"));
}
