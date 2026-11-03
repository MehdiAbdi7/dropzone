import ProductImage from "@/components/ui/ProductImage";
import { swatchOf } from "@/config/colors";
import AddToCartButton from "@/features/cart/AddToCartButton";
import GiftList from "@/features/products/GiftList";
import { formatPrice } from "@/lib/format";
import type { Variant } from "@/types/api";

// Une affaire neuve, dans son encadré rouge : un appareil précis que le gérant a mis en
// affaire (« Neuf, batterie 100 %, juste sans boîte »). Pas d'ancien prix barré : on
// n'invente rien, le prix affiché est celui de l'affaire.
export default function DealOffer({ variant, image }: { variant: Variant; image: string | null }) {
  const { Couleur: color, ...otherOptions } = variant.options;
  const swatch = color ? swatchOf(color) : null;

  return (
    <article className="card grid gap-4 border-2 border-red p-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:p-5">
      <div className="relative mx-auto aspect-square w-32 overflow-hidden rounded-[10px] bg-surface-2">
        <ProductImage src={image} alt="" sizes="128px" />
        <span className="badge badge-deal absolute left-2 top-2">Affaire</span>
      </div>
      <div className="min-w-0 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-bold text-red">Prix exceptionnel</p>
          <p className="font-display text-2xl font-bold">
            {formatPrice(variant.price)} <span className="text-sm font-semibold text-ink-muted">TTC</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {color ? (
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {swatch ? (
                  <span aria-hidden="true" className="size-3.5 rounded-full border border-black/20" style={{ background: swatch }} />
                ) : null}
                {color}
              </span>
            ) : null}
            {Object.values(otherOptions).map((value) => (
              <span key={value} className="text-ink-muted">
                · {value}
              </span>
            ))}
          </p>
        </div>
        {/* Les détails du gérant : sans eux, on ne saurait pas pourquoi c'est une affaire. */}
        {variant.dealNote ? <p className="break-words font-semibold">{variant.dealNote}</p> : null}
        <GiftList gifts={variant.gifts} />
        <AddToCartButton variant={variant} />
      </div>
    </article>
  );
}
