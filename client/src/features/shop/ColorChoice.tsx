import type { ProductKind } from "@/types/api";
import { type ColorTile, colorHref, kindIcon } from "./colors";
import { ChoiceCard } from "./ConditionChoice";

// L'étape Couleur (05/11) : une tuile par couleur du modèle, avec sa photo (ou l'icône de la
// catégorie) et son prix de départ. Une couleur sans rien en stock reste à sa place, barrée,
// sans lien, « Indisponible » (règle de Mehdi : ce qui manque est barré, jamais caché).
export default function ColorChoice({ slug, kind, tiles }: { slug: string; kind: ProductKind; tiles: ColorTile[] }) {
  return (
    <section aria-label="Choisissez la couleur" className="space-y-3">
      <h2 className="text-xl">Choisissez la couleur</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {tiles.map((tile) => (
          <ChoiceCard
            key={tile.name}
            href={colorHref(slug, tile.name)}
            image={tile.photoUrl ?? kindIcon(kind)}
            badge={null}
            title={tile.name}
            price={tile.fromPrice !== null ? { prefix: "dès ", value: tile.fromPrice } : null}
            detail={tile.available ? "" : "Indisponible"}
            warranty={null}
            disabled={!tile.available}
          />
        ))}
      </div>
    </section>
  );
}
