import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { CartIcon } from "@/components/ui/icons";
import { CONDITION_LABELS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/types/api";

// Toute la carte est un seul lien vers la fiche : il faut choisir une variante (ou
// un appareil reconditionné) avant d'ajouter au panier. La pastille du panier en
// bas à droite n'est donc qu'un repère visuel, pas un deuxième lien vers la même page.
// `href` : une autre page que la fiche (la liste des reconditionnés mène à leur radiographie).
export default function ProductCard({ product, sizes, href }: { product: ProductCardData; sizes: string; href?: string }) {
  return (
    <Link
      href={href ?? `/produits/${product.slug}`}
      className="card group flex w-full flex-col gap-2 p-2 transition-[border-color,box-shadow] sm:gap-3 sm:p-3 sm:hover:border-blue-ink sm:hover:shadow-[var(--shadow)]"
    >
      <div className="relative aspect-[1/0.9] overflow-hidden rounded-[10px] bg-surface-2 sm:aspect-square">
        <ProductImage src={product.image} alt="" sizes={sizes} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {!product.inStock ? <span className="badge badge-out">Rupture</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-0 pb-0.5 sm:px-1">
        <div className="flex min-h-5 flex-wrap items-center gap-1">
          {product.hasRefurbished ? (
            <span className="badge badge-refurb">{CONDITION_LABELS.refurbished}</span>
          ) : null}
          {product.hasNew ? <span className="badge badge-new">{CONDITION_LABELS.new}</span> : null}
        </div>
        <p className="text-[0.7rem] font-semibold text-ink-muted sm:text-xs">{product.brand ?? product.category.name}</p>
        <h3 className="line-clamp-2 text-[0.8rem] leading-snug sm:text-[0.95rem] sm:group-hover:text-blue-ink">
          {product.name}
          {product.arrivalColor ? ` · ${product.arrivalColor}` : ""}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-0 pt-1.5 sm:gap-2 sm:pt-2">
          {product.inStock ? (
            <p className="leading-tight">
              <span className="block text-xs text-ink-muted">
                {product.arrivalVariantId ? "Prix" : "À partir de"}
              </span>
              <span className="font-display text-xs font-bold whitespace-nowrap sm:text-base">{formatPrice(product.minPrice)}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-muted">Bientôt de retour</p>
          )}
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-blue text-on-brand transition-colors group-hover:bg-[var(--blue-hover)] sm:size-9"
          >
            <CartIcon size={17} className="size-[15px] sm:size-[17px]" />
          </span>
        </div>
      </div>
    </Link>
  );
}
