import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { SpecGlyph } from "@/components/ui/icons";
import { CONDITION_LABELS } from "@/config/catalog";
import { type Palette, swatchOf } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import type { PosterModel } from "@/types/api";
import { glowColor, posterStatus, specIcon } from "./series";

// Une colonne de l'affiche : la photo sur la lueur de sa couleur, le nom, 4 caractéristiques,
// les couleurs (barrées si épuisées) et les prix « dès ». Toute la colonne mène à la fiche
// du modèle (l'étape Neuf scellé ou Affaire). Un modèle épuisé reste, grisé, sans lien.
export default function PosterColumn({
  model,
  palette,
  priority,
}: {
  model: PosterModel;
  palette: Palette;
  priority: boolean;
}) {
  // « Pas encore en vente » (aucune fiche publiée) ou « Épuisé » : la colonne est grisée,
  // son nom barré, et elle ne se clique pas, comme une carte Neuf ou Affaire vide.
  const status = posterStatus(model);
  const body = (
    <>
      <div className="relative h-36 w-full md:h-40">
        <div
          aria-hidden="true"
          className="poster-glow"
          style={{ background: `radial-gradient(closest-side, ${glowColor(model.posterColor, palette)}, transparent 75%)` }}
        />
        <ProductImage src={model.image} alt="" sizes="(min-width: 768px) 25vw, 78vw" priority={priority} />
      </div>
      <h2 className={`text-lg font-bold text-white ${status ? "line-through" : ""}`}>{model.name}</h2>

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

      {/* Les couleurs officielles du modèle, comme sur une affiche de lancement : rien
          n'est barré ici, le stock par couleur se lit sur la page Neuf scellé. */}
      {model.colors.length > 0 ? (
        <ul aria-label="Couleurs" className="flex flex-wrap justify-center gap-2">
          {model.colors.map((color) => {
            const swatch = swatchOf(color, palette);
            return (
              <li key={color} title={color}>
                {swatch ? (
                  <span aria-hidden="true" className="poster-swatch" style={{ backgroundColor: swatch }} />
                ) : (
                  <span aria-hidden="true" className="text-xs text-white/80">
                    {color}
                  </span>
                )}
                <span className="sr-only">{color}</span>
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
        {status ? <p className="font-semibold text-white">{status}</p> : null}
      </div>
    </>
  );

  const className = "poster-column flex h-full flex-col items-center gap-2 rounded-2xl px-3 pb-3 text-center";
  if (status || !model.productSlug) {
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
