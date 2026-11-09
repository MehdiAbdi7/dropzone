import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { CONDITION_LABELS } from "@/config/catalog";
import type { Palette } from "@/config/colors";
import { formatPrice } from "@/lib/format";
import type { ChoiceColumnData } from "./choiceColumns";
import { glowColor } from "./series";

// Une colonne de l'affiche de choix (05/11), au style d'une colonne de l'affiche de la série
// (PosterColumn) : l'image sur la lueur, le titre, les lignes, le prix et « Choisir ». Sans
// lien (rien en stock), la colonne est grisée et son titre barré.
export default function ChoiceColumn({
  column,
  palette,
  priority,
}: {
  column: ChoiceColumnData;
  palette: Palette;
  priority: boolean;
}) {
  const off = column.href === null;
  const body = (
    <>
      <div className="choice-card-media relative h-48 w-full md:h-40">
        <div
          aria-hidden="true"
          className="poster-glow"
          style={{ background: `radial-gradient(closest-side, ${glowColor(column.glow, palette)}, transparent 75%)` }}
        />
        <ProductImage src={column.image} alt="" sizes="(min-width: 768px) 25vw, 78vw" priority={priority} />
      </div>
      {column.badge ? (
        <span className={`badge ${column.badge === "new" ? "bg-blue text-on-brand" : "bg-white text-black"}`}>
          {CONDITION_LABELS[column.badge === "new" ? "new" : "refurbished"]}
        </span>
      ) : null}
      <h2 className={`text-lg font-bold text-white ${off ? "line-through" : ""}`}>{column.title}</h2>
      <span className={`choice-stock-badge ${off ? "choice-stock-badge-off" : "choice-stock-badge-on"}`}>
        {off ? "Indisponible" : "Disponible"}
      </span>
      <div aria-hidden="true" className="h-px w-2/3 bg-white/15" />
      {off ? (
        <div className="choice-empty-state">
          <span aria-hidden="true" className="choice-empty-state-icon">
            i
          </span>
          <p>{column.badge ? column.lines[0] : "Aucun article en stock dans cette couleur."}</p>
        </div>
      ) : (
        <div className="space-y-0.5 text-xs text-white/75">
          {column.price ? (
            <p>
              {column.price.prefix}
              <span className="font-display text-base font-extrabold whitespace-nowrap text-white">
                {formatPrice(column.price.value)}
              </span>
            </p>
          ) : null}
          {column.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {off ? null : (
        <span className="choice-card-cta mt-auto">Choisir</span>
      )}
    </>
  );

  const className = "poster-column choice-card flex h-full flex-col items-center gap-2 rounded-2xl px-3 pb-3 text-center";
  if (off) {
    return (
      <div aria-disabled="true" data-unavailable="true" className={className}>
        {body}
      </div>
    );
  }
  return (
    <Link href={column.href!} data-available="true" className={className}>
      {body}
    </Link>
  );
}
