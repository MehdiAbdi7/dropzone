import ProductImage from "@/components/ui/ProductImage";
import NeonLines from "./NeonLines";
import type { StageDevice } from "./stageLayout";

// Le socle néon et ses appareils, placés en pourcentages du cadre (5:4). Les appareils
// viennent de stageLayout.ts : les photos du gérant (back-office › Accueil, 06/11), sinon
// les illustrations de départ. Aussi utilisé tel quel pour l'aperçu du back-office.
// Le décor entier est décoratif (aria-hidden) : le texte à côté dit tout.
export default function DeviceStage({
  devices,
  id,
  className = "",
}: {
  devices: StageDevice[];
  id: string;
  className?: string;
}) {
  return (
    <div className={`stage ${className}`} aria-hidden="true">
      <NeonLines id={id} />
      <div className="stage-halo" />
      <div className="stage-plinth" />
      {devices.map((device) => (
        // `object-bottom` : la photo se cale en bas de sa case carrée, donc l'objet pose sur
        // le socle au lieu de flotter (un ordinateur, plus large que haut, restait au milieu).
        <div key={device.slot} className={`stage-item [&_img]:object-bottom ${device.position}`}>
          <ProductImage src={device.src} alt="" sizes="(min-width: 1024px) 320px, 45vw" />
        </div>
      ))}
    </div>
  );
}
