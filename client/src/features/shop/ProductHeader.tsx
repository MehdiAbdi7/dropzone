import type { ReactNode } from "react";
import ProductImage from "@/components/ui/ProductImage";
import type { ProductDetail } from "@/types/api";
import Breadcrumb, { type Crumb } from "./Breadcrumb";

// Le haut commun des pages d'un produit : le fil d'Ariane complet
// (Boutique › Smartphones › iPhone › iPhone 18 Pro Max › Neuf), la photo à gauche,
// la marque et le nom à droite, puis le contenu de l'étape (`children`).
export default function ProductHeader({
  product,
  step,
  children,
}: {
  product: ProductDetail;
  step?: string;
  children: ReactNode;
}) {
  const category = `/boutique/${product.category.slug}`;
  const crumbs: Crumb[] = [
    { label: "Boutique", href: "/boutique" },
    { label: product.category.name, href: category },
    product.brand
      ? { label: product.brand.name, href: `${category}/${product.brand.slug}` }
      : { label: "Autres", href: `${category}/autres` },
    // La série, entre la marque et le modèle : Boutique › Smartphones › iPhone › iPhone 18 › …
    ...(product.brand && product.series
      ? [{ label: product.series.name, href: `${category}/${product.brand.slug}/${product.series.slug}` }]
      : []),
    { label: product.name, href: `/produits/${product.slug}` },
    ...(step ? [{ label: step }] : []),
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={crumbs} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Sur téléphone, une photo plus petite : les choix arrivent plus vite à l'écran. */}
        <div className="mx-auto w-full max-w-72 sm:max-w-sm lg:sticky lg:top-6 lg:max-w-none lg:self-start">
          <div className="card relative aspect-square overflow-hidden bg-surface-2">
            <ProductImage src={product.images[0]?.url ?? null} alt={product.name} sizes="(min-width: 1024px) 480px, 100vw" priority />
          </div>
        </div>
        <div className="min-w-0 space-y-6">
          <header className="space-y-2">
            {product.deviceModel || product.brand ? (
              <p className="text-sm font-semibold text-ink-muted">{product.deviceModel?.brand ?? product.brand?.name}</p>
            ) : null}
            <h1 className="text-3xl sm:text-4xl">
              {product.name}
              {step ? <span className="text-ink-muted"> · {step}</span> : null}
            </h1>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
