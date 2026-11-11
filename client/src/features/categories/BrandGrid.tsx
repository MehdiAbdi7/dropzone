import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { DEVICE_KINDS } from "@/config/catalog";
import type { Category } from "@/types/api";

// Les marques d'une catégorie (refonte du 11/11 au soir) : une seule grille de petites cartes
// toutes pareilles, le logo et le nom sur une ligne, sans séparation entre « plus demandées » et
// « autres », sans nombre de modèles, sans photo ni prix. Toute la carte est le lien. Elles
// restent plus petites que les cartes de catégories au-dessus (demande de Mehdi : une marque est
// un choix de second niveau). Les accessoires se rangent par type, les appareils par marque.
// Bordure unie, comme la barre des catégories : le dégradé de `.card` ajoutait du bruit.
const cardClass =
  "group flex w-full items-center gap-2.5 rounded-[var(--radius-card)] border border-line bg-surface px-3 py-2.5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-ink-muted";

export default function BrandGrid({ category }: { category: Category }) {
  const isDevice = DEVICE_KINDS.includes(category.kind);
  const href = (slug: string) => `/boutique/${category.slug}/${slug}`;

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {category.brands.map((brand) => (
        <li key={brand.slug} className="flex">
          <Link href={href(brand.slug)} className={cardClass}>
            <span className="grid h-7 w-11 shrink-0 place-items-center text-ink">
              {brand.logoUrl ? (
                <BrandLogo url={brand.logoUrl} size={28} width={44} />
              ) : (
                <span aria-hidden="true" className="font-display text-lg font-bold text-ink-muted">
                  {brand.name.charAt(0)}
                </span>
              )}
            </span>
            <span className="min-w-0 truncate font-display text-sm font-bold group-hover:text-blue-ink">{brand.name}</span>
          </Link>
        </li>
      ))}
      {category.hasUnbranded ? (
        <li className="flex">
          <Link href={href("autres")} className={cardClass}>
            <span aria-hidden="true" className="grid h-7 w-11 shrink-0 place-items-center font-display text-lg font-bold text-ink-muted">
              …
            </span>
            <span className="min-w-0 truncate font-display text-sm font-bold group-hover:text-blue-ink">
              Autres <span className="sr-only">{isDevice ? "(sans marque)" : "(sans type)"}</span>
            </span>
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
