import Image from "next/image";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import type { Palette } from "@/config/colors";
import type { SeriesSummary } from "@/types/api";
import { glowColor } from "./series";

// Une affiche de la page « choisis ta série » : toute l'affiche est un seul lien vers
// l'affiche de la série. Sans couverture envoyée par le gérant, l'affiche de secours :
// le nom en grand, en lettres creuses, sur une lueur de la couleur de la série.
// Une série épuisée reste visible, grisée et sans lien (on la voit, on ne la clique pas).
export default function SeriesCard({
  series,
  href,
  onSelect,
  palette,
  priority,
}: {
  series: SeriesSummary;
  href?: string;
  // Le comptoir (fenêtre de vente) : un bouton à la place du lien, la page ne change pas.
  onSelect?: () => void;
  palette: Palette;
  priority: boolean;
}) {
  const modelCount = series.models.length;
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
      {/* Même bandeau que SeriesTile du Catalogue (tailles comprises) : le nom au dégradé,
          puis une pastille avec le nombre de modèles. Ni prix ni bouton « Voir » (choix de
          Mehdi) : toute l'affiche est le lien. */}
      <div className="absolute inset-x-0 bottom-0 z-10 space-y-1.5 p-2 sm:space-y-2 sm:p-3">
        <h2 className="series-title w-fit max-w-full truncate text-base leading-tight font-extrabold sm:text-xl">
          {series.name}
        </h2>
        <div className="flex min-w-0 flex-wrap gap-1 text-[10px] font-bold sm:gap-1.5 sm:text-xs">
          <span className="rounded-full border border-white/25 bg-black/75 px-1.5 py-0.5 text-white sm:px-2">
            {modelCount} modèle{modelCount > 1 ? "s" : ""}
          </span>
          {series.soldOut ? <span className="rounded-full bg-[#d61f45] px-1.5 py-0.5 text-white sm:px-2">Épuisé</span> : null}
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
  if (onSelect || !href) {
    return (
      <button type="button" onClick={onSelect} className="series-card w-full text-left">
        {body}
      </button>
    );
  }
  return (
    <Link href={href} className="series-card">
      {body}
    </Link>
  );
}
