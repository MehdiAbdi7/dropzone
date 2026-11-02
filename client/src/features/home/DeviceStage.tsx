import ProductImage from "@/components/ui/ProductImage";
import NeonLines from "./NeonLines";

// Les appareils posés sur le socle, placés en pourcentages du cadre (5:4).
// Pour passer aux photos : remplacer `src` par le chemin de la photo (fond
// transparent, cadrée carrée). Les positions et la mise en page ne bougent pas.
type StageDevice = { src: string; position: string };

export const HERO_DEVICES: StageDevice[] = [
  { src: "/products/charger.svg", position: "left-[19%] bottom-[33%] w-[22%]" },
  { src: "/products/watch.svg", position: "left-[4%] bottom-[16%] w-[30%] z-10" },
  { src: "/products/phone.svg", position: "left-[26%] bottom-[15%] w-[48%] z-20" },
  { src: "/products/earbuds.svg", position: "right-[4%] bottom-[16%] w-[30%] z-10" },
];

export const DEAL_DEVICES: StageDevice[] = [
  { src: "/products/charger.svg", position: "left-[6%] bottom-[16%] w-[30%] z-10" },
  { src: "/products/phone.svg", position: "left-[26%] bottom-[15%] w-[48%] z-20" },
  { src: "/products/earbuds.svg", position: "right-[6%] bottom-[16%] w-[30%] z-10" },
];

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
        <div key={device.src} className={`stage-item ${device.position}`}>
          <ProductImage src={device.src} alt="" sizes="(min-width: 1024px) 270px, 45vw" />
        </div>
      ))}
    </div>
  );
}
