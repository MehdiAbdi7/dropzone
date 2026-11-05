import { publicFetch } from "@/lib/publicFetch";
import type { ProductDetail } from "@/types/api";

// La fiche d'un produit, partagée par ses trois pages (modèle, neuf, reconditionné)
// et leurs generateMetadata : Next déduplique le même appel dans un rendu.
export function getProduct(slug: string) {
  return publicFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
}
