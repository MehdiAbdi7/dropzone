import ProductImage from "@/components/ui/ProductImage";
import { formatPrice } from "@/lib/format";
import type { AccessoryItem } from "@/types/api";
import { accessoryHint } from "./filters";

// La carte d'un accessoire (refonte du 12/11) : un bouton qui ouvre la fenêtre d'achat, pas un
// lien (on règle et on ajoute sans quitter la page). La photo, la marque en étiquette s'il y en
// a une, le nom, ce qu'on choisira (« De 20 à 100 W »), et le prix, « dès » quand il varie.
export default function AccessoryCard({ item, onOpen }: { item: AccessoryItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface text-start transition-[border-color,transform] hover:-translate-y-0.5 hover:border-blue-ink"
    >
      <span className="relative block aspect-[4/3] bg-surface-2">
        <ProductImage src={item.image} alt="" sizes="(min-width: 1024px) 220px, 45vw" />
        {item.maker ? (
          <span className="absolute top-2 left-2 rounded-full border border-line bg-bg/70 px-2 py-0.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">
            {item.maker.name}
          </span>
        ) : null}
      </span>
      <span className="flex flex-1 flex-col gap-0.5 px-3 pt-2.5 pb-3">
        <span className="text-sm leading-snug font-semibold group-hover:text-blue-ink">{item.name}</span>
        <span className="text-xs text-ink-muted">{accessoryHint(item)}</span>
        <span className="mt-auto pt-1.5 font-bold tabular-nums">
          {item.hasRange ? <span className="text-sm font-medium text-ink-muted">dès </span> : null}
          {formatPrice(item.minPrice)}
          {!item.inStock ? <span className="ms-2 text-xs font-semibold text-red">Épuisé</span> : null}
        </span>
      </span>
    </button>
  );
}
