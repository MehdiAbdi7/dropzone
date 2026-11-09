import Image from "next/image";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import type { Palette } from "@/config/colors";
import { glowColor } from "@/features/shop/series";
import type { AdminSeriesTile } from "../adminApi";

// Une série dans le Catalogue : couverture, nom et stocks regroupés dans un bandeau.
export default function SeriesTile({ series, palette }: { series: AdminSeriesTile; palette: Palette }) {
  return (
    <Link
      href={`/admin/catalogue/series/${series.id}`}
      aria-label={`Modifier la série ${series.name}`}
      className="series-card block"
    >
      <div className="series-media">
        {series.coverUrl ? (
          <Image
            src={series.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 380px, 50vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(70% 90% at 80% 40%, ${glowColor(series.fallbackColor, palette)}, transparent 70%), #07080c` }}
          >
            {series.fallbackImage ? (
              <div className="absolute right-[4%] top-[6%] h-[55%] w-[45%]">
                <ProductImage src={series.fallbackImage} alt="" sizes="20vw" />
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="series-info absolute inset-x-0 bottom-0 z-10 space-y-1.5 p-2 sm:space-y-2 sm:p-3">
        <h2 className="w-fit max-w-full truncate text-base font-extrabold leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] text-gradient sm:text-xl">
          {series.name}
        </h2>
        <div className="flex min-w-0 flex-wrap gap-1 text-[10px] font-bold sm:gap-1.5 sm:text-xs">
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-white sm:px-2">
            {series.modelCount} modèle{series.modelCount > 1 ? "s" : ""}
          </span>
          {series.newStock > 0 ? <span className="rounded-full bg-[#1f5fd6] px-1.5 py-0.5 text-white sm:px-2">{series.newStock} neufs</span> : null}
          {series.dealCount > 0 ? (
            <span className="rounded-full bg-[#d61f45] px-1.5 py-0.5 text-white sm:px-2">
              {series.dealCount} affaire{series.dealCount > 1 ? "s" : ""}
            </span>
          ) : null}
          {series.coverUrl ? null : <span className="rounded-full bg-[#ffb547] px-1.5 py-0.5 text-black sm:px-2">Pas d&apos;image</span>}
        </div>
      </div>
    </Link>
  );
}
