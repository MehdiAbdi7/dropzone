import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { ProductCard } from "@/types/api";

// La carte d'un modèle à l'étape « marque » : la photo, le nom, une ligne de prix par état
// en stock. Rien en stock : grisée, « Épuisé », sans lien (on la voit, on ne la clique pas).
export default function ModelCard({ product, sizes }: { product: ProductCard; sizes: string }) {
  const soldOut = product.newFrom === null && product.refurbishedFrom === null;

  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
        <ProductImage src={product.image} alt="" sizes={sizes} />
        {soldOut ? (
          <span className="badge badge-out absolute left-2 top-2">Épuisé</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 pb-0.5">
        <h3 className={`text-sm leading-snug sm:text-[0.95rem] ${soldOut ? "line-through" : "group-hover:text-blue-ink"}`}>
          {product.name}
        </h3>
        <div className="mt-auto space-y-0.5 pt-1 text-xs text-ink-muted">
          {product.newFrom !== null ? (
            <p>
              {CONDITION_LABELS.new} dès <span className="font-display text-sm font-bold whitespace-nowrap text-ink">{formatPrice(product.newFrom)}</span>
            </p>
          ) : null}
          {product.refurbishedFrom !== null ? (
            <p>
              {CONDITION_LABELS.refurbished} dès{" "}
              <span className="font-display text-sm font-bold whitespace-nowrap text-ink">
                {formatPrice(product.refurbishedFrom)}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </>
  );

  const className = "card flex w-full flex-col gap-3 p-2.5 sm:p-3";
  if (soldOut) {
    return (
      <div aria-disabled="true" className={`${className} opacity-50`}>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/produits/${product.slug}`}
      className={`${className} group transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)]`}
    >
      {body}
    </Link>
  );
}
