import Image from "next/image";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import type { Palette } from "@/config/colors";
import { glowColor } from "@/features/shop/series";
import type { AdminSeriesTile } from "../adminApi";

// Une série dans le Catalogue, en affiche comme dans la Boutique : sa couverture ou
// l'affiche de secours, son stock, et « Pas d'image » tant qu'il manque la couverture.
export default function SeriesTile({ series, palette }: { series: AdminSeriesTile; palette: Palette }) {
  return (
    <Link href={`/admin/catalogue/series/${series.id}`} className="series-card block">
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
            <p aria-hidden="true" className="series-fallback-title absolute left-3 top-2 max-w-[70%] text-5xl">
              {series.name}
            </p>
            {series.fallbackImage ? (
              <div className="absolute right-[4%] top-[6%] h-[55%] w-[45%]">
                <ProductImage src={series.fallbackImage} alt="" sizes="20vw" />
              </div>
            ) : null}
          </div>
        )}
      </div>
      <span className="absolute top-2 right-2 z-10 rounded-full border border-white/30 bg-black/70 px-2.5 py-1 text-xs font-bold text-white">
        ✎ Modifier
      </span>
      <div className="absolute inset-x-0 bottom-0 z-10 space-y-1.5 p-3">
        <h2 className="text-lg font-extrabold text-white">{series.name}</h2>
        <div className="flex flex-wrap gap-1.5 text-xs font-bold">
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-white">
            {series.modelCount} modèle{series.modelCount > 1 ? "s" : ""}
          </span>
          {series.newStock > 0 ? <span className="rounded-full bg-[#1f5fd6] px-2 py-0.5 text-white">{series.newStock} neufs</span> : null}
          {series.dealCount > 0 ? (
            <span className="rounded-full bg-[#d61f45] px-2 py-0.5 text-white">
              {series.dealCount} affaire{series.dealCount > 1 ? "s" : ""}
            </span>
          ) : null}
          {series.coverUrl ? null : <span className="rounded-full bg-[#ffb547] px-2 py-0.5 text-black">Pas d&apos;image</span>}
        </div>
      </div>
    </Link>
  );
}
