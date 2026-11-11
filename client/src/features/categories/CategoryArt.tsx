import { StageItem } from "@/features/home/DeviceStage";
import type { Category } from "@/types/api";
import { categoryDevices } from "./art";

// L'image d'une catégorie, dessinée de la même façon partout (11/11) : sur sa grande tuile de
// l'accueil, dans la barre de la Boutique, dans la recherche. Ce sont toujours les mêmes photos,
// réglées une fois dans Personnalisation ; seule l'échelle change.
//
// La composition vit dans un cadre 5:4 (celui du socle de l'accueil, où les places sont en %).
// Ce cadre est ajusté au parent sans jamais en sortir ni se déformer : `container-type: size`
// donne au parent des unités `cqw` et `cqh`, et le cadre prend `min(100cqw, 125cqh)` de large
// (5/4 de la hauteur : 125 % de `cqh`). Le parent doit donc avoir une taille à lui.
// Décoratif (aria-hidden) : le nom de la catégorie est écrit à côté.
export default function CategoryArt({
  category,
  className = "absolute inset-0",
}: {
  category: Pick<Category, "kind" | "photos" | "fallbackImage">;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`[container-type:size] ${className}`}>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "min(100cqw, 125cqh)", aspectRatio: "5 / 4" }}
      >
        {categoryDevices(category).map((device) => (
          <StageItem key={device.slot} device={device} />
        ))}
      </div>
    </div>
  );
}
