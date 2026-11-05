import type { ReactNode } from "react";
import ProductImage from "@/components/ui/ProductImage";
import type { ProductDetail } from "@/types/api";
import Breadcrumb, { type Crumb } from "./Breadcrumb";
import { colorHref } from "./colors";

// Le haut commun des pages d'un produit : le fil d'Ariane complet
// (Boutique › Smartphones › iPhone › iPhone 18 Pro Max › Neuf), la photo à gauche,
// la marque et le nom à droite, puis le contenu de l'étape (`children`).
// Le fil d'Ariane d'un produit, partagé avec l'affiche de choix (05/11) :
// Boutique › Smartphones › iPhone › iPhone 18 › iPhone 18 Pro › Glacier › Neuf scellé.
export function productCrumbs(product: ProductDetail, color: string | null, step?: string): Crumb[] {
  const category = `/boutique/${product.category.slug}`;
  return [
    { label: "Boutique", href: "/boutique" },
    { label: product.category.name, href: category },
    product.brand
      ? { label: product.brand.name, href: `${category}/${product.brand.slug}` }
      : { label: "Autres", href: `${category}/autres` },
    // La série, entre la marque et le modèle : Boutique › Smartphones › iPhone › iPhone 18 › …
    ...(product.brand && product.series
      ? [{ label: product.series.name, href: `${category}/${product.brand.slug}/${product.series.slug}` }]
      : []),
    color || step ? { label: product.name, href: `/produits/${product.slug}` } : { label: product.name },
    // Sur l'étape Neuf ou Affaire, la couleur ramène au choix Neuf / Affaire de cette couleur.
    ...(color ? [step ? { label: color, href: colorHref(product.slug, color) } : { label: color }] : []),
    ...(step ? [{ label: step }] : []),
  ];
}

// Après l'étape Couleur : la couleur entre le modèle et l'étape, et sa photo à gauche
// (`image`, sinon la photo du produit).
export default function ProductHeader({
  product,
  step,
  color,
  image,
  children,
}: {
  product: ProductDetail;
  step?: string;
  color?: string | null;
  image?: string | null;
  children: ReactNode;
}) {
  const crumbs = productCrumbs(product, color ?? null, step);
  const title = [color, step].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <Breadcrumb items={crumbs} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Sur téléphone, une photo plus petite : les choix arrivent plus vite à l'écran. */}
        <div className="mx-auto w-full max-w-72 sm:max-w-sm lg:sticky lg:top-6 lg:max-w-none lg:self-start">
          <div className="card relative aspect-square overflow-hidden bg-surface-2">
            <ProductImage src={image ?? product.images[0]?.url ?? null} alt={color ? `${product.name}, ${color}` : product.name} sizes="(min-width: 1024px) 480px, 100vw" priority />
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <header className="space-y-2">
            {product.deviceModel || product.brand ? (
              <p className="text-sm font-semibold text-ink-muted">{product.deviceModel?.brand ?? product.brand?.name}</p>
            ) : null}
            <h1 className="text-3xl sm:text-4xl">
              {product.name}
              {title ? <span className="text-ink-muted"> · {title}</span> : null}
            </h1>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
