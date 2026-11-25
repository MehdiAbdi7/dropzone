import type { ReactNode } from "react";
import { NeonSides, fadeToward } from "@/features/home/NeonLines";

// Le fond des pages du parcours d'achat (25/11, demande de Mehdi : le haut de page était vide) : une
// lueur très douce en haut, et sur ordinateur les traits de néon de l'accueil dans les marges, en
// fondu vers le contenu. Les traits ne passent jamais sous le contenu : chaque bande a la largeur de
// la marge libre à côté de lui (`contentMax` = largeur du contenu de la page, plus 60 px d'air), et
// aucune sous cette largeur (même règle que « Notre sélection » de l'accueil).
export default function ShopBackdrop({ contentMax, children }: { contentMax: number; children: ReactNode }) {
  const width = `max(0px, calc((100vw - ${contentMax}px - 60px) / 2))`;
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="shop-glow" />
        <div className="absolute inset-y-0 left-0 hidden overflow-hidden lg:block" style={{ width, ...fadeToward("right") }}>
          <NeonSides id="shop-left" side="left" />
        </div>
        <div className="absolute inset-y-0 right-0 hidden overflow-hidden lg:block" style={{ width, ...fadeToward("left") }}>
          <NeonSides id="shop-right" side="right" />
        </div>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
