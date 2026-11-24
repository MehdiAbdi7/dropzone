import type { Crumb } from "@/features/shop/Breadcrumb";
import type { ProductKind } from "@/types/api";

// Le chemin d'un produit sous le titre de sa fiche (24/11, demande de Mehdi). La catégorie et le modèle se choisissent
// avant la fiche (à la création, ou en arrivant depuis la carte d'un modèle) : sur la fiche ils se lisent comme un
// chemin cliquable, Catalogue › Smartphones › iPhone › iPhone 18 › iPhone 18 Pro, qui sert aussi de retour vers la
// série. Le dernier morceau est la page en cours, sans lien.

type TrailProduct = {
  category: { id: number; name: string; kind: ProductKind };
  // Un appareil : la marque de la Boutique (« iPhone »). Un accessoire : son type (« Chargeurs »).
  brand: { id: number; name: string } | null;
  // La marque d'un accessoire (« Anker »), dans son type.
  maker?: { id: number; name: string } | null;
  deviceModel: { name: string; series: { id: number; name: string } | null } | null;
};

const CATALOGUE: Crumb = { label: "Catalogue", href: "/admin/catalogue" };

export function productTrail(product: TrailProduct): Crumb[] {
  const trail: Crumb[] = [CATALOGUE, { label: product.category.name, href: `/admin/catalogue/${product.category.id}` }];
  if (product.deviceModel) {
    if (product.brand) trail.push({ label: product.brand.name, href: `/admin/catalogue/marques/${product.brand.id}` });
    if (product.deviceModel.series) {
      trail.push({ label: product.deviceModel.series.name, href: `/admin/catalogue/series/${product.deviceModel.series.id}` });
    }
    trail.push({ label: product.deviceModel.name });
    return trail;
  }
  // Un accessoire : son type est une page du Catalogue ; sa marque, la page en cours.
  if (product.brand) {
    trail.push(product.maker ? { label: product.brand.name, href: `/admin/catalogue/types/${product.brand.id}` } : { label: product.brand.name });
  }
  if (product.maker) trail.push({ label: product.maker.name });
  return trail;
}

// À la création, le choix en cours : des noms sans lien (rien n'existe encore sur lequel renvoyer), seulement les
// morceaux déjà choisis.
export function selectionTrail({ category, brand, last }: { category: string | null; brand: string | null; last: string | null }): Crumb[] {
  return [CATALOGUE, ...[category, brand, last].flatMap((label) => (label ? [{ label }] : []))];
}
