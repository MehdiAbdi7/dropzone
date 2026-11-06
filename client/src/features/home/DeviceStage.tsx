import type { CSSProperties } from "react";
import ProductImage from "@/components/ui/ProductImage";
import NeonLines from "./NeonLines";
import type { Box, StageDevice } from "./stageLayout";

// La place d'une photo sur le socle, en % du cadre (stageLayout.ts). En style plutôt qu'en
// classes Tailwind : depuis le 06/11, le gérant choisit ces nombres à la souris.
export function boxStyle(box: Box): CSSProperties {
  return { left: `${box.x}%`, bottom: `${box.y}%`, width: `${box.w}%`, zIndex: box.z };
}

// Le socle néon et ses appareils. Les appareils viennent de stageLayout.ts : les photos du
// gérant (back-office › Accueil), sinon les illustrations de départ. `children` : les
// poignées de l'éditeur du back-office, posées par-dessus le même décor.
// Le décor est décoratif (aria-hidden) : le texte à côté dit tout.
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
      <StageDecor id={id} />
      {devices.map((device) => (
        <StageItem key={device.slot} device={device} />
      ))}
    </div>
  );
}

export function StageDecor({ id }: { id: string }) {
  return (
    <>
      <NeonLines id={id} />
      <div className="stage-halo" />
      <div className="stage-plinth" />
    </>
  );
}

// `object-bottom` : la photo se cale en bas de sa case carrée, donc l'objet pose sur le socle
// au lieu de flotter. Une photo (adresse https) n'a pas la marge intérieure des dessins.
export function StageItem({ device }: { device: StageDevice }) {
  return (
    <div
      className={`stage-item [&_img]:object-bottom ${device.src.startsWith("http") ? "[&_img]:p-0" : ""}`}
      style={boxStyle(device.box)}
    >
      <ProductImage src={device.src} alt="" sizes="(min-width: 1024px) 400px, 50vw" />
    </div>
  );
}
