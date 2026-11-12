import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import type { Maker } from "@/types/api";

// Les marques d'un type d'accessoires (Apple, Samsung, Anker dans Chargeurs) : l'étape marque entre
// le type et les affiches (12/11), au même style que les marques d'appareils (BrandGrid). La carte
// « Autres » réunit les produits du type qui n'ont pas de marque.
const cardClass =
  "group flex w-full items-center gap-2.5 rounded-[var(--radius-card)] border border-line bg-surface px-3 py-2.5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-ink-muted";

export default function MakerGrid({
  categorySlug,
  typeSlug,
  makers,
  withoutMaker,
}: {
  categorySlug: string;
  typeSlug: string;
  makers: Maker[];
  withoutMaker: number;
}) {
  const href = (slug: string) => `/boutique/${categorySlug}/${typeSlug}/${slug}`;

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {makers.map((maker) => (
        <li key={maker.slug} className="flex">
          <Link href={href(maker.slug)} className={cardClass}>
            <span className="grid h-7 w-11 shrink-0 place-items-center text-ink">
              {maker.logoUrl ? (
                <BrandLogo url={maker.logoUrl} size={28} width={44} />
              ) : (
                <span aria-hidden="true" className="font-display text-lg font-bold text-ink-muted">
                  {maker.name.charAt(0)}
                </span>
              )}
            </span>
            <span className="min-w-0 truncate font-display text-sm font-bold group-hover:text-blue-ink">{maker.name}</span>
          </Link>
        </li>
      ))}
      {withoutMaker > 0 ? (
        <li className="flex">
          <Link href={href("autres")} className={cardClass}>
            <span aria-hidden="true" className="grid h-7 w-11 shrink-0 place-items-center font-display text-lg font-bold text-ink-muted">
              …
            </span>
            <span className="min-w-0 truncate font-display text-sm font-bold group-hover:text-blue-ink">
              Autres <span className="sr-only">(sans marque)</span>
            </span>
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
