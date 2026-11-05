import Image from "next/image";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { Palette } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import type { SeriesSummary } from "@/types/api";
import { ctaLabel, glowColor } from "./series";

// Une affiche de la page « choisis ta série » : toute l'affiche est un seul lien vers
// l'affiche de la série. Sans couverture envoyée par le gérant, l'affiche de secours :
// le nom en grand, en lettres creuses, sur une lueur de la couleur de la série.
// Une série épuisée reste visible, grisée et sans lien (on la voit, on ne la clique pas).
export default function SeriesCard({
  series,
  href,
  palette,
  priority,
}: {
  series: SeriesSummary;
  href: string;
  palette: Palette;
  priority: boolean;
}) {
  const media = series.coverUrl ? (
    <Image
      src={series.coverUrl}
      alt=""
      fill
      sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw"
      priority={priority}
      className="object-cover"
    />
  ) : (
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(70% 90% at 80% 40%, ${glowColor(series.fallback.color, palette)}, transparent 70%), #07080c`,
      }}
    >
      <p
        aria-hidden="true"
        className="series-fallback-title absolute left-4 top-3 max-w-[70%] text-6xl md:text-7xl"
      >
        {series.name}
      </p>
      {series.fallback.image ? (
        <div className="absolute right-[4%] top-[6%] h-[58%] w-[48%]">
          <ProductImage
            src={series.fallback.image}
            alt=""
            sizes="(min-width: 1280px) 190px, (min-width: 768px) 25vw, 50vw"
            priority={priority}
          />
        </div>
      ) : null}
    </div>
  );

  const body = (
    <>
      <div className="series-media">{media}</div>
      {/* Le bouton reste sous le prix à toutes les tailles : à côté, il serrait les
          modèles sur plusieurs lignes et le bloc sortait par le haut de l'affiche. */}
      {/* Affiche « mini » sur téléphone (2 par ligne, choix de Mehdi du 05/11) : à 164 px
          de large, les pastilles des modèles passaient une par ligne et le bloc montait
          jusqu'à 82 px au-dessus de l'affiche. Sous 768 px : le prix et « Voir » seulement. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-3 md:gap-3 md:p-5">
        <div className="min-w-0 space-y-2">
          {/* Le titre n'est plus affiché (la couverture porte déjà le nom), mais il
              reste pour les lecteurs d'écran : un titre par série dans la page. */}
          <h2 className="sr-only">{series.name}</h2>
          <ul
            aria-label="Modèles de la série"
            className="hidden flex-wrap gap-1.5 md:flex"
          >
            {series.models.map((model) => (
              <li
                key={model}
                className="rounded-full border border-white/30 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white"
              >
                {model}
              </li>
            ))}
          </ul>
          {series.fromPrice !== null ? (
            <p className="text-sm text-white/85">
              dès{" "}
              <span className="font-display text-base font-bold whitespace-nowrap text-white">
                {formatPrice(series.fromPrice)}
              </span>
            </p>
          ) : null}
        </div>
        {series.soldOut ? (
          <span className="badge badge-out self-start">Épuisé</span>
        ) : (
          <span className="series-cta w-full">
            <span className="md:hidden">Voir</span>
            <span className="hidden md:inline">{ctaLabel(series.name)}</span>
            <ArrowRightIcon size={16} />
          </span>
        )}
      </div>
    </>
  );

  if (series.soldOut) {
    return (
      <div aria-disabled="true" className="series-card">
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className="series-card">
      {body}
    </Link>
  );
}
