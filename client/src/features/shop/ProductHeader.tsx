import type { ReactNode } from "react";
import ProductImage from "@/components/ui/ProductImage";
import type { ProductDetail } from "@/types/api";
import Breadcrumb, { type Crumb } from "./Breadcrumb";
import { findLibraryLogo } from "../../config/brandLogos";
import Image from "next/image";

// Le haut commun des pages d'un produit : le fil d'Ariane complet
// (Boutique › Smartphones › iPhone › iPhone 18 Pro Max › Neuf), la photo à gauche,
// la marque et le nom à droite, puis le contenu de l'étape (`children`).
// Le fil d'Ariane d'un produit, partagé avec l'affiche de choix (05/11, ordre inversé le 23/11) :
// Boutique › Smartphones › iPhone › iPhone 18 › iPhone 18 Pro › Neuf scellé › Glacier. `stepHref` : l'étape mène à
// son choix des couleurs.
export function productCrumbs(
  product: ProductDetail,
  color: string | null,
  step?: string,
  stepHref?: string,
): Crumb[] {
  const category = `/boutique/${product.category.slug}`;
  return [
    { label: "Boutique", href: "/boutique" },
    { label: product.category.name, href: category },
    product.brand
      ? { label: product.brand.name, href: `${category}/${product.brand.slug}` }
      : { label: "Autres", href: `${category}/autres` },
    // La série, entre la marque et le modèle : Boutique › Smartphones › iPhone › iPhone 18 › …
    ...(product.brand && product.series
      ? [
          {
            label: product.series.name,
            href: `${category}/${product.brand.slug}/${product.series.slug}`,
          },
        ]
      : []),
    // La marque d'un accessoire, entre son type et lui : Boutique › Accessoires › Chargeurs › Anker › …
    ...(product.brand && product.maker
      ? [
          {
            label: product.maker.name,
            href: `${category}/${product.brand.slug}/${product.maker.slug}`,
          },
        ]
      : []),
    color || step
      ? { label: product.name, href: `/produits/${product.slug}` }
      : { label: product.name },
    // Une couleur choisie : l'étape ramène au choix des couleurs de cet état.
    ...(step ? [color && stepHref ? { label: step, href: stepHref } : { label: step }] : []),
    ...(color ? [{ label: color }] : []),
  ];
}

// Après l'étape Couleur : la couleur entre le modèle et l'étape, et sa photo à gauche
// (`image`, sinon la photo du produit).
export default function ProductHeader({
  product,
  step,
  stepHref,
  color,
  image,
  journey,
  children,
}: {
  product: ProductDetail;
  step?: string;
  stepHref?: string;
  color?: string | null;
  image?: string | null;
  // Le parcours d'achat (25/11) d'un appareil : il remplace le fil d'Ariane. Un accessoire n'en a pas.
  journey?: ReactNode;
  children: ReactNode;
}) {
  const crumbs = productCrumbs(product, color ?? null, step, stepHref);
  const title = [step, color].filter(Boolean).join(" · ");

  const brandLogo = findLibraryLogo(product.brand?.name ?? "");

  return (
    <div className="space-y-5">
      {journey ?? <Breadcrumb items={crumbs} />}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
        <div className="mx-auto w-full max-w-sm lg:sticky lg:top-24 lg:max-w-none">
          <div className="card product-stage relative aspect-square overflow-hidden rounded-3xl lg:aspect-[1/0.92]">
            <div aria-hidden="true" className="product-stage-glow" />
            <div className="absolute left-4 top-4 z-20 grid size-11 place-items-center rounded-full border border-line bg-surface/80 p-2.5  sm:left-5 sm:top-5 sm:size-12">
              <Image
                src={brandLogo ?? "/brands/unknown.svg"}
                alt={product.brand?.name ?? "Marque inconnue"}
                fill
                sizes="48px"
                className="object-contain p-2.5 brightness-0 opacity-75 dark:invert"
              />
            </div>
            <div className="product-stage-image absolute inset-[14%] z-10 sm:inset-[16%]">
              <ProductImage
                src={image ?? product.images[0]?.url ?? null}
                alt={color ? `${product.name}, ${color}` : product.name}
                sizes="(min-width: 1024px) 560px, (min-width: 640px) 384px, 100vw"
                priority
              />
            </div>
          </div>
        </div>
        <div className="min-w-0 space-y-5 lg:pt-2">
          <header className="space-y-3 border-b border-line pb-5">
            {product.deviceModel || product.brand ? (
              <p className="text-xs font-bold tracking-[0.16em] text-blue-ink uppercase">
                {product.deviceModel?.brand ?? product.brand?.name}
              </p>
            ) : null}
            <h1 className="text-3xl leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              {product.name}
            </h1>
            {title ? (
              <div className="flex flex-wrap gap-2">
                {color ? (
                  <span className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink-muted">
                    {color}
                  </span>
                ) : null}
                {step ? (
                  <span className="rounded-full border border-blue/20 bg-blue-soft px-3 py-1 text-sm font-bold text-blue-ink">
                    {step}
                  </span>
                ) : null}
              </div>
            ) : null}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
