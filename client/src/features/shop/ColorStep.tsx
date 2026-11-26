import type { Palette } from "@/config/colors";
import type { ProductDetail } from "@/types/api";
import ColorViewer from "./ColorViewer";
import type { ViewerParams } from "./colorViewerRules";
import ProductFacts from "./ProductFacts";
import { ProductJourney } from "./ProductJourney";
import ShopBackdrop from "./ShopBackdrop";

// L'étape Couleur des pages Neuf et Occasion (23/11). Depuis le 25/11, la visionneuse de couleurs remplace
// l'affiche en colonnes : un grand téléphone qui change de couleur en fondu, toutes les couleurs du modèle
// montrées (une couleur sans stock dans cet état est un peu assombrie, avec la mention), et le bouton qui
// mène à la fiche de la couleur choisie. `preview` : la couleur de l'adresse (`?apercu=`).
// Le parcours d'achat (25/11) remplace le fil d'Ariane ; son bouton retour mène au choix de l'état.
export default function ColorStep({
  product,
  condition,
  palette,
  params,
}: {
  product: ProductDetail;
  condition: "new" | "refurbished";
  palette: Palette;
  params: ViewerParams;
}) {
  return (
    <ShopBackdrop contentMax={1200}>
      <div className="container-page space-y-4 py-4">
        <ProductJourney product={product} current="color" condition={condition} color={null} />
        <ColorViewer product={product} condition={condition} palette={palette} params={params} />
        <ProductFacts product={product} descriptionMobileOnly />
      </div>
    </ShopBackdrop>
  );
}
