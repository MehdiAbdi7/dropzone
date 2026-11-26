"use client";

import type { Palette } from "@/config/colors";
import type { ProductDetail, Variant } from "@/types/api";
import { offerVariants } from "./colorViewerRules";
import type { JourneyCondition } from "./journey";
import NewPicker from "./NewPicker";
import RefurbishedList from "./RefurbishedList";

// Les offres d'une couleur dans la visionneuse (25/11, demande de Mehdi) : ce que montraient les pages
// Neuf et Occasion après le clic sur « Voir les offres », mais à droite du téléphone, sans changer de page.
// Un neuf : le choix de stockage, le prix et le bouton panier (NewPicker). Une occasion : la liste des
// appareils, une radiographie chacun (RefurbishedList). « Changer de couleur » rend la main à la visionneuse.
// Depuis le 26/11, la variante choisie (le stockage d'un neuf, l'appareil d'une occasion) remonte à la visionneuse
// (`onShow`) : ce sont ses photos et sa vidéo qui s'affichent sous le téléphone. `shownSku` : celle qui est montrée.
export default function ViewerOffers({
  product,
  colorName,
  condition,
  palette,
  shownSku,
  onShow,
  onBack,
}: {
  product: ProductDetail;
  colorName: string;
  condition: JourneyCondition;
  palette: Palette;
  shownSku: string | null;
  onShow: (variant: Variant) => void;
  onBack: () => void;
}) {
  const variants = offerVariants(product, colorName, condition);
  return (
    <div className="viewer-offers">
      <button type="button" className="viewer-back" onClick={onBack}>
        ← Changer de couleur
      </button>
      {condition === "new" ? (
        <NewPicker variants={variants} kind={product.category.kind} palette={palette} colorChosen initialSku={shownSku ?? undefined} onCurrent={onShow} />
      ) : (
        <RefurbishedList variants={variants} kind={product.category.kind} palette={palette} selectedSku={shownSku} onSelect={onShow} />
      )}
    </div>
  );
}
