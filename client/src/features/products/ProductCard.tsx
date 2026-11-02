import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { formatPrice } from "@/lib/format";
import type { ProductCard as ProductCardData } from "@/types/api";

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/produits/${product.slug}`}
      className="card group flex flex-col overflow-hidden transition-colors hover:border-blue-ink"
    >
      <div className="relative aspect-square bg-surface-2">
        <ProductImage src={product.image} alt="" sizes="(min-width: 1024px) 280px, 50vw" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.hasRefurbished ? <span className="badge badge-refurb">Reconditionné</span> : null}
          {product.hasDeal ? <span className="badge badge-deal">Affaire</span> : null}
          {!product.inStock ? <span className="badge badge-out">Rupture</span> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="text-xs font-semibold text-ink-muted">{product.brand ?? product.category.name}</p>
        <h3 className="text-base group-hover:text-blue-ink">{product.name}</h3>
        <p className="mt-auto pt-2 text-sm">
          {product.inStock ? (
            <>
              <span className="text-ink-muted">À partir de </span>
              <span className="font-display text-lg font-bold">{formatPrice(product.minPrice)}</span>
            </>
          ) : (
            <span className="text-ink-muted">Bientôt de retour</span>
          )}
        </p>
      </div>
    </Link>
  );
}
