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
      sizes="(min-width: 1280px) 380px, 50vw"
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
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 p-2.5 md:gap-3 md:p-5">
        <div className="min-w-0">
          <h2 className="sr-only">{series.name}</h2>
          <ul
            aria-label="Modèles de la série"
            className="series-models"
          >
            {series.models.map((model) => (
              <li key={model} className="series-model-tag">{model}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-row items-center justify-between gap-3">
          {series.fromPrice !== null ? (
            <p className="text-xs text-white/80 md:text-sm">
              dès{" "}
              <span className="font-display text-sm font-bold whitespace-nowrap text-white md:text-base">
                {formatPrice(series.fromPrice)}
              </span>
            </p>
          ) : null}
          {series.soldOut ? (
            <span className="badge badge-out">Épuisé</span>
          ) : (
            <span className="series-cta">
              <span className="md:hidden">Voir</span>
              <span className="hidden md:inline">{ctaLabel(series.name)}</span>
              <ArrowRightIcon size={14} />
            </span>
          )}
        </div>
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
