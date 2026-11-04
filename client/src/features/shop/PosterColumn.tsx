import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { SpecGlyph } from "@/components/ui/icons";
import { CONDITION_LABELS } from "@/config/catalog";
import { swatchOf } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import type { PosterModel } from "@/types/api";
import { glowColor, specIcon } from "./series";

// Une colonne de l'affiche : la photo sur la lueur de sa couleur, le nom, 4 caractéristiques,
// les couleurs (barrées si épuisées) et les prix « dès ». Toute la colonne mène à la fiche
// du modèle (l'étape Neuf scellé ou Affaire). Un modèle épuisé reste, grisé, sans lien.
export default function PosterColumn({ model, priority }: { model: PosterModel; priority: boolean }) {
  const body = (
    <>
      <div className="relative h-52 w-full md:h-60">
        <div
          aria-hidden="true"
          className="poster-glow"
          style={{ background: `radial-gradient(closest-side, ${glowColor(model.posterColor)}, transparent 75%)` }}
        />
        <ProductImage src={model.image} alt="" sizes="(min-width: 768px) 25vw, 78vw" priority={priority} />
      </div>
      <h2 className={`text-lg font-bold text-white ${model.soldOut ? "line-through" : ""}`}>{model.name}</h2>

      {model.specs.length > 0 ? (
        <ul className="w-full max-w-[16rem] space-y-1.5 text-left text-xs text-white/80">
          {model.specs.map(([key, value]) => (
            <li key={key} className="flex items-start gap-2">
              <SpecGlyph icon={specIcon(key)} size={14} className="mt-px shrink-0 text-white/55" />
              <span>
                <span className="sr-only">{key} : </span>
                {value}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {model.colors.length > 0 ? (
        <ul aria-label="Couleurs" className="flex flex-wrap justify-center gap-2">
          {model.colors.map((color) => {
            const swatch = swatchOf(color.name);
            return (
              <li key={color.name} title={color.inStock ? color.name : `${color.name} (épuisée)`}>
                {swatch ? (
                  <span
                    aria-hidden="true"
                    className={`poster-swatch ${color.inStock ? "" : "poster-swatch-out"}`}
                    style={{ backgroundColor: swatch }}
                  />
                ) : (
                  <span aria-hidden="true" className={`text-xs text-white/80 ${color.inStock ? "" : "line-through"}`}>
                    {color.name}
                  </span>
                )}
                <span className="sr-only">
                  {color.name}
                  {color.inStock ? "" : " (épuisée)"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div aria-hidden="true" className="h-px w-2/3 bg-white/15" />
      <div className="space-y-0.5 text-xs text-white/75">
        {model.newFrom !== null ? (
          <p>
            {CONDITION_LABELS.new} dès{" "}
            <span className="font-display text-base font-extrabold whitespace-nowrap text-white">{formatPrice(model.newFrom)}</span>
          </p>
        ) : null}
        {model.dealFrom !== null ? (
          <p>
            {CONDITION_LABELS.refurbished} dès{" "}
            <span className="font-display text-base font-extrabold whitespace-nowrap text-white">{formatPrice(model.dealFrom)}</span>
          </p>
        ) : null}
        {model.soldOut ? <p className="font-semibold text-white">Épuisé</p> : null}
      </div>
    </>
  );

  const className = "poster-column flex h-full flex-col items-center gap-3 rounded-2xl px-3 pb-4 text-center";
  if (model.soldOut) {
    return (
      <div aria-disabled="true" className={`${className} opacity-50`}>
        {body}
      </div>
    );
  }
  return (
    <Link href={`/produits/${model.productSlug}`} className={className}>
      {body}
    </Link>
  );
}
