"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { boxStyle } from "@/features/home/DeviceStage";
import type { Category } from "@/types/api";
import { categoryDevices, contentBounds } from "./art";

// L'image d'une catégorie, dessinée de la même façon partout (11/11) : sur sa tuile de
// l'accueil, dans la barre de la Boutique, dans Personnalisation. Ce sont toujours les mêmes
// photos, réglées une fois dans Personnalisation, aux mêmes places les unes par rapport aux
// autres ; seule l'échelle change.
//
// Le cadrage automatique : le cadre 5:4 de la composition est agrandi jusqu'à ce que la zone
// réellement occupée par les photos (contentBounds, art.ts) remplisse `fill` de la place, puis
// centré. Le calcul se fait en CSS : `container-type: size` donne au parent des unités `cqw` et
// `cqh` (1 % de sa largeur, de sa hauteur), donc rien à mesurer en JavaScript, et c'est juste à
// toutes les tailles. Seule la forme de chaque photo (largeur / hauteur) vient du navigateur, à
// son chargement : avant, chaque photo compte comme carrée.
// Le parent doit avoir une taille à lui. Décoratif (aria-hidden) : le nom est écrit à côté.
export default function CategoryArt({
  category,
  className = "absolute inset-0",
  fill = 0.9,
  sizes = "(min-width: 1024px) 600px, 90vw",
}: {
  category: Pick<Category, "kind" | "photos" | "fallbackImage">;
  className?: string;
  // La part de la place que les photos remplissent (0,9 : une petite marge autour).
  fill?: number;
  sizes?: string;
}) {
  const devices = categoryDevices(category);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const bounds = contentBounds(devices.map((device) => ({ box: device.box, aspect: aspects[device.src] ?? 1 })));
  const percent = fill * 100;
  // --f : la largeur du cadre. La plus grande qui fait tenir la zone occupée dans la place.
  const frame = {
    "--f": `min(calc(${percent}cqw / ${bounds.width}), calc(${percent}cqh / ${bounds.height}))`,
    width: "var(--f)",
    aspectRatio: "5 / 4",
    left: `calc(50cqw - var(--f) * ${bounds.minX + bounds.width / 2})`,
    bottom: `calc(50cqh - var(--f) * ${bounds.minY + bounds.height / 2})`,
  } as CSSProperties;

  return (
    <div aria-hidden="true" className={`[container-type:size] ${className}`}>
      <div className="absolute" style={frame}>
        {devices.map((device) => (
          <div key={device.slot} className="absolute aspect-square" style={boxStyle(device.box)}>
            <Image
              src={device.src}
              alt=""
              fill
              sizes={sizes}
              unoptimized={device.src.endsWith(".svg")}
              className="object-contain object-bottom drop-shadow-[0_14px_18px_rgb(0_0_0/0.45)]"
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) {
                  const aspect = naturalWidth / naturalHeight;
                  setAspects((current) => (current[device.src] === aspect ? current : { ...current, [device.src]: aspect }));
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
