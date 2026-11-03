import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { CartIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/types/api";

// La ligne d'état, d'après les variantes encore en stock.
function stateLabel(product: ProductCardData): string | null {
  if (product.hasNew && product.hasRefurbished) {
    return "Neuf et reconditionné";
  }
  if (product.hasRefurbished) {
    return "Reconditionné";
  }
  return product.hasNew ? "Neuf" : null;
}

// Toute la carte est un seul lien vers la fiche : il faut choisir une variante (ou
// un appareil reconditionné) avant d'ajouter au panier. La pastille du panier en
// bas à droite n'est donc qu'un repère visuel, pas un deuxième lien vers la même page.
// `href` : une autre page que la fiche (la liste des reconditionnés mène à leur radiographie).
export default function ProductCard({ product, sizes, href }: { product: ProductCardData; sizes: string; href?: string }) {
  const state = stateLabel(product);
  // `?? null` : une réponse mise en cache avant les affaires (jusqu'à 5 minutes) n'a pas
  // ce champ, et la carte afficherait « NaN DA ».
  const dealFrom = product.dealFrom ?? null;

  return (
    <Link
      href={href ?? `/produits/${product.slug}`}
      className="card group flex w-full flex-col gap-3 p-2.5 transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)] sm:p-3"
    >
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
        <ProductImage src={product.image} alt="" sizes={sizes} />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          {product.hasRefurbished ? <span className="badge badge-refurb">Reconditionné</span> : null}
          {product.hasDeal ? <span className="badge badge-deal">Affaire</span> : null}
          {!product.inStock ? <span className="badge badge-out">Rupture</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 pb-0.5">
        <p className="text-xs font-semibold text-ink-muted">{product.brand ?? product.category.name}</p>
        <h3 className="line-clamp-2 text-sm leading-snug group-hover:text-blue-ink sm:text-[0.95rem]">{product.name}</h3>
        {state ? <p className="text-xs text-ink-muted">{state}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {dealFrom !== null ? (
            // Une affaire en stock : son prix à la place du « À partir de », sans ancien prix barré.
            <p className="leading-tight">
              <span className="block text-xs font-bold text-red">Prix exceptionnel</span>
              <span className="font-display text-base font-bold whitespace-nowrap">{formatPrice(dealFrom)}</span>
            </p>
          ) : product.inStock ? (
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
