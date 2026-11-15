import Image from "next/image";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import type { Palette } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import type { SeriesSummary } from "@/types/api";
import { glowColor } from "./series";

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
        {/* Le nom de la série au dégradé de la marque, comme dans le Catalogue du back-office.
            Plus de pastilles de modèles : la série suffit, les modèles se voient sur son affiche. */}
        <h2 className="text-gradient w-fit max-w-full truncate pb-0.5 text-2xl leading-tight font-extrabold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] md:text-4xl">
          {series.name}
        </h2>
        <div className="flex flex-row items-center justify-between gap-3">
          {series.fromPrice !== null ? (
            <p className="text-xs text-white/80 md:text-sm">
              dès{" "}
              <span className="font-display text-sm font-bold whitespace-nowrap text-white md:text-base">
                {formatPrice(series.fromPrice)}
              </span>
            </p>
          ) : null}
          {/* Pas de bouton « Voir » (choix de Mehdi, 11/11) : toute l'affiche est le lien. */}
          {series.soldOut ? <span className="badge badge-out">Épuisé</span> : null}
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
