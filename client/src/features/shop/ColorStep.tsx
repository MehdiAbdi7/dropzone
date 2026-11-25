import { CONDITION_LABELS } from "@/config/catalog";
import type { Palette } from "@/config/colors";
import type { ProductDetail } from "@/types/api";
import ChoicePoster from "./ChoicePoster";
import { colorColumns } from "./choiceColumns";
import ProductFacts from "./ProductFacts";
import { ProductJourney } from "./ProductJourney";
import ShopBackdrop from "./ShopBackdrop";

// L'étape Couleur des pages Neuf et Occasion (23/11) : l'affiche des couleurs du modèle, chacune avec son prix « dès »
// et son stock dans l'état choisi ; une couleur sans stock dans cet état est barrée.
// Le parcours d'achat (25/11) remplace le fil d'Ariane et le lien « ‹ Neuf scellé ou occasion » : son bouton retour
// mène au choix de l'état.
export default function ColorStep({ product, condition, palette }: { product: ProductDetail; condition: "new" | "refurbished"; palette: Palette }) {
  const label = CONDITION_LABELS[condition];
  return (
    <ShopBackdrop contentMax={1200}>
      <div className="container-page space-y-4 py-4">
        <ProductJourney product={product} current="color" condition={condition} color={null} />
        <ChoicePoster kicker="CHOISISSEZ LA COULEUR" title={`${product.name} · ${label}`} columns={colorColumns(product, condition)} palette={palette} />
        <ProductFacts product={product} />
      </div>
    </ShopBackdrop>
  );
}
