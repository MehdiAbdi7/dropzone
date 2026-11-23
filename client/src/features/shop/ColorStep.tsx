import Link from "next/link";
import { CONDITION_LABELS } from "@/config/catalog";
import type { Palette } from "@/config/colors";
import type { ProductDetail } from "@/types/api";
import Breadcrumb from "./Breadcrumb";
import ChoicePoster from "./ChoicePoster";
import { colorColumns } from "./choiceColumns";
import ProductFacts from "./ProductFacts";
import { productCrumbs } from "./ProductHeader";

// L'étape Couleur des pages Neuf et Occasion (23/11) : l'affiche des couleurs du modèle, chacune avec son prix « dès »
// et son stock dans l'état choisi ; une couleur sans stock dans cet état est barrée.
export default function ColorStep({ product, condition, palette }: { product: ProductDetail; condition: "new" | "refurbished"; palette: Palette }) {
  const label = CONDITION_LABELS[condition];
  return (
    <div className="container-page space-y-4 py-4">
      <Breadcrumb items={productCrumbs(product, null, label)} />
      <ChoicePoster kicker="CHOISISSEZ LA COULEUR" title={`${product.name} · ${label}`} columns={colorColumns(product, condition)} palette={palette} />
      <Link href={`/produits/${product.slug}`} className="inline-block text-sm text-blue-ink underline">
        ‹ Neuf scellé ou occasion
      </Link>
      <ProductFacts product={product} />
    </div>
  );
}
