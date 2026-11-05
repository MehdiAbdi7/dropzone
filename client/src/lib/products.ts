import { publicFetch } from "@/lib/publicFetch";
import type { ProductDetail } from "@/types/api";

// La fiche d'un produit, partagée par ses trois pages (modèle, neuf, reconditionné)
// et leurs generateMetadata : Next déduplique le même appel dans un rendu.
// `colors` vaut [] si l'API n'est pas encore à jour (front déployé avant l'API) : la page
// saute alors l'étape Couleur, comme avant, au lieu de planter.
export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const product = await publicFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
  return product ? { ...product, colors: product.colors ?? [], posterColor: product.posterColor ?? null } : null;
}
