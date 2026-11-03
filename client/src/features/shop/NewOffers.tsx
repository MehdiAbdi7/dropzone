import type { ProductKind, Variant } from "@/types/api";
import DealOffer from "./DealOffer";
import NewPicker from "./NewPicker";
import { splitDeals } from "./stock";

// L'achat d'un neuf, partagé par la page Neuf d'un appareil et la fiche d'un accessoire :
// les affaires en haut, chacune dans son encadré, puis le choix habituel, dont les
// chiffres ne comptent pas les exemplaires en affaire. Sans neuf normal en stock, seules
// les affaires s'affichent (pas de choix où tout est épuisé).
export default function NewOffers({
  variants,
  kind,
  image,
  regularTitle,
}: {
  variants: Variant[];
  kind: ProductKind;
  image: string | null;
  // Le titre du choix habituel quand des affaires sont au-dessus.
  regularTitle: string;
}) {
  const { deals, regular } = splitDeals(variants);
  if (deals.length === 0) {
    return <NewPicker variants={regular} kind={kind} />;
  }

  return (
    <div className="space-y-6">
      <section aria-label={deals.length > 1 ? "Affaires" : "Affaire"} className="space-y-3">
        {deals.map((deal) => (
          <DealOffer key={deal.sku} variant={deal} image={image} />
        ))}
      </section>
      {regular.some((variant) => variant.stock > 0) ? (
        <section aria-labelledby="regular-choice" className="space-y-3">
          <h2 id="regular-choice" className="text-xl">
            {regularTitle}
          </h2>
          <NewPicker variants={regular} kind={kind} />
        </section>
      ) : null}
    </div>
  );
}
