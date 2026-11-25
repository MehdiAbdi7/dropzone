import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { SpecGlyph } from "@/components/ui/icons";
import { CONDITION_LABELS } from "@/config/catalog";
import { type Palette, swatchOf } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import type { PosterModel } from "@/types/api";
import { uniformPhoto } from "./photos";
import { glowColor, posterStatus, specIcon } from "./series";

// Une colonne de l'affiche : la photo sur la lueur de sa couleur, le nom, 4 caractéristiques,
// les couleurs et les prix « dès ». La colonne mène à la fiche du modèle (l'étape Neuf scellé ou
// Occasion) ; chaque pastille de couleur mène à la visionneuse de couleurs de ce modèle, sur cette
// couleur (25/11, demande de Mehdi : voir un modèle dans toutes ses couleurs sans rien acheter).
// Un modèle épuisé ou pas encore en vente reste, grisé, sans lien.
//
// Pas de lien dans un lien : la colonne est un conteneur dont le lien vers la fiche est étiré sur toute
// sa surface (`poster-link`), sous le contenu ; le contenu laisse passer les clics (`pointer-events`),
// sauf les pastilles, qui sont les seuls liens posés par-dessus.
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
  const slug = status ? null : model.productSlug;
  const body = (
    <>
      <div className="poster-photo relative w-full">
        <div
          aria-hidden="true"
          className="poster-glow"
          style={{ background: `radial-gradient(closest-side, ${glowColor(model.posterColor, palette)}, transparent 75%)` }}
        />
        {/* Recadrée (25/11) : tous les téléphones de l'affiche à la même hauteur. */}
        <ProductImage
          src={model.image ? uniformPhoto(model.image, "model") : null}
          alt=""
          sizes="(min-width: 768px) 25vw, 78vw"
          priority={priority}
        />
      </div>
      <h2 className={`text-lg font-bold text-white ${status ? "line-through" : ""}`}>{model.name}</h2>

      {model.specs.length > 0 ? (
        <ul className="poster-specs w-full max-w-[16rem] text-left text-xs text-white/80">
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

      {/* Les couleurs officielles du modèle, comme sur une affiche de lancement : rien n'est barré
          ici. Chacune ouvre la visionneuse sur elle (zone de toucher de 28 px, pastille de 14 px). */}
      {model.colors.length > 0 ? (
        <ul aria-label="Couleurs" className="flex flex-wrap justify-center">
          {model.colors.map((color) => {
            const swatch = swatchOf(color, palette);
            const mark = swatch ? (
              <span aria-hidden="true" className="poster-swatch" style={{ backgroundColor: swatch }} />
            ) : (
              <span aria-hidden="true" className="text-xs text-white/80">
                {color}
              </span>
            );
            return (
              <li key={color} title={color}>
                {slug ? (
                  <Link
                    href={`/produits/${slug}/couleurs?apercu=${encodeURIComponent(color)}`}
                    className="poster-swatch-link"
                    aria-label={`Voir le ${model.name} en ${color}`}
                  >
                    {mark}
                  </Link>
                ) : (
                  <span className="poster-swatch-link" data-static="">
                    {mark}
                    <span className="sr-only">{color}</span>
                  </span>
                )}
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

  const className = "poster-column poster-stack flex h-full flex-col items-center rounded-2xl px-3 pb-3 text-center";
  if (!slug) {
    return (
      <div aria-disabled="true" className={`${className} opacity-50`}>
        {body}
      </div>
    );
  }
  return (
    <div className={`${className} poster-column-linked`}>
      <Link href={`/produits/${slug}`} className="poster-link" aria-label={model.name} />
      {body}
    </div>
  );
}
