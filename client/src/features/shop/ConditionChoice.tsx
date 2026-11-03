import Link from "next/link";
import type { ReactNode } from "react";
import ProductImage from "@/components/ui/ProductImage";
import { formatPrice } from "@/lib/format";
import type { Variant } from "@/types/api";
import { conditionSummary } from "./stock";

// Une des deux grandes cartes. Sans stock : barrée, grisée, sans lien (règle de Mehdi :
// les deux cartes s'affichent toujours, on ne saute jamais cette étape).
function ChoiceCard({
  href,
  image,
  badge,
  title,
  price,
  detail,
  disabled,
}: {
  href: string;
  image: string | null;
  badge: ReactNode;
  title: string;
  // Le prix de départ (null : rien en stock) et la ligne de quantité.
  price: { prefix: string; value: number } | null;
  detail: string;
  disabled: boolean;
}) {
  const body = (
    <>
      <div className="relative aspect-square overflow-hidden rounded-[10px] bg-surface-2">
        <ProductImage src={image} alt="" sizes="(min-width: 1024px) 260px, 45vw" />
        <span className="absolute left-2 top-2">{badge}</span>
      </div>
      <div className="space-y-0.5 px-1 text-center">
        <p className={`font-display font-bold ${disabled ? "line-through" : "group-hover:text-blue-ink"}`}>{title}</p>
        {price ? (
          <p className="text-sm text-ink-muted">
            {price.prefix}
            <span className="font-display font-bold whitespace-nowrap text-ink">{formatPrice(price.value)}</span>
          </p>
        ) : null}
        <p className="text-sm text-ink-muted">{detail}</p>
      </div>
    </>
  );
  const className = "card flex w-full flex-col gap-3 p-3 pb-4";
  if (disabled) {
    return (
      <div aria-disabled="true" className={`${className} opacity-50`}>
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className={`${className} group transition-[border-color,box-shadow] hover:border-blue-ink hover:shadow-[var(--shadow)]`}>
      {body}
    </Link>
  );
}

// Étape 4 du parcours : neuf ou reconditionné, avec le prix de départ et ce qui reste.
export default function ConditionChoice({ slug, image, variants }: { slug: string; image: string | null; variants: Variant[] }) {
  const summary = conditionSummary(variants);
  // « À partir de » seulement s'il y a plusieurs prix neufs en stock ; sinon le prix seul.
  const newPrices = new Set(variants.filter((v) => v.condition === "new" && v.stock > 0).map((v) => v.price));
  const n = summary.refurbishedCount;

  return (
    <section aria-label="Neuf ou reconditionné" className="grid grid-cols-2 gap-3 sm:gap-4">
      <ChoiceCard
        href={`/produits/${slug}/neuf`}
        image={image}
        badge={<span className="badge bg-blue text-on-brand">Neuf</span>}
        title="Jamais utilisé"
        price={summary.newFrom !== null ? { prefix: newPrices.size > 1 ? "À partir de " : "", value: summary.newFrom } : null}
        detail={summary.newFrom !== null ? `${summary.newStock} en stock` : "Aucun neuf en stock"}
        disabled={summary.newFrom === null}
      />
      <ChoiceCard
        href={`/produits/${slug}/reconditionne`}
        image={image}
        // Fond plein (et non le bleu léger des cartes produit) : le badge passe sur la photo.
        badge={<span className="badge bg-ink text-surface">Reconditionné</span>}
        title="Testé et décrit pièce par pièce"
        price={summary.refurbishedFrom !== null ? { prefix: "À partir de ", value: summary.refurbishedFrom } : null}
        detail={summary.refurbishedFrom !== null ? `${n} appareil${n > 1 ? "s" : ""}` : "Aucun reconditionné en stock"}
        disabled={summary.refurbishedFrom === null}
      />
    </section>
  );
}
