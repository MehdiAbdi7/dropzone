import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { CartIcon } from "@/components/ui/icons";
import { CONDITION_LABELS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/types/api";

// La ligne d'état, d'après les variantes encore en stock.
function stateLabel(product: ProductCardData): string | null {
  if (product.hasNew && product.hasRefurbished) {
    return "Neuf scellé et affaires";
  }
  if (product.hasRefurbished) {
    return CONDITION_LABELS.refurbished;
  }
  return product.hasNew ? CONDITION_LABELS.new : null;
}

// Toute la carte est un seul lien vers la fiche : il faut choisir une variante (ou
// un appareil reconditionné) avant d'ajouter au panier. La pastille du panier en
// bas à droite n'est donc qu'un repère visuel, pas un deuxième lien vers la même page.
// `href` : une autre page que la fiche (la liste des reconditionnés mène à leur radiographie).
export default function ProductCard({ product, sizes, href }: { product: ProductCardData; sizes: string; href?: string }) {
  const state = stateLabel(product);

  return (
    <Link
      href={href ?? `/produits/${product.slug}`}
      className="card group flex w-full flex-col gap-3 p-2.5 transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)] sm:p-3"
    >
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
        <ProductImage src={product.image} alt="" sizes={sizes} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {product.hasRefurbished ? <span className="badge badge-refurb">{CONDITION_LABELS.refurbished}</span> : null}
          {!product.inStock ? <span className="badge badge-out">Rupture</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 pb-0.5">
        <p className="text-xs font-semibold text-ink-muted">{product.brand ?? product.category.name}</p>
        <h3 className="line-clamp-2 text-sm leading-snug group-hover:text-blue-ink sm:text-[0.95rem]">{product.name}</h3>
        {state ? <p className="text-xs text-ink-muted">{state}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {product.inStock ? (
            <p className="leading-tight">
              <span className="block text-xs text-ink-muted">À partir de</span>
              <span className="font-display text-base font-bold whitespace-nowrap">{formatPrice(product.minPrice)}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-muted">Bientôt de retour</p>
          )}
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-blue text-on-brand transition-colors group-hover:bg-[var(--blue-hover)]"
          >
            <CartIcon size={17} />
          </span>
        </div>
      </div>
    </Link>
  );
}
