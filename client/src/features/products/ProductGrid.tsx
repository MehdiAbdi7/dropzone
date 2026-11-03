import type { ProductCard as ProductCardData } from "@/types/api";
import ProductCard from "./ProductCard";

type LinkTo = "refurbished" | "deal";

// L'adresse d'une carte, quand ce n'est pas la page du modèle. Une affaire des deux
// côtés mène à l'étape « neuf ou reconditionné », où chaque carte annonce la sienne.
// Un accessoire en affaire passe par /neuf, qui le renvoie à sa fiche.
function cardHref(product: ProductCardData, linkTo?: LinkTo): string | undefined {
  const page =
    linkTo === "refurbished" || (linkTo === "deal" && product.dealIn === "refurbished")
      ? "reconditionne"
      : linkTo === "deal" && product.dealIn === "new"
        ? "neuf"
        : null;
  return page ? `/produits/${product.slug}/${page}` : undefined;
}

// `wide` : 6 colonnes sur grand écran (l'accueil) ; sinon 4, comme le catalogue.
// `sizes` dit au navigateur la largeur réelle des images, pour le jour des photos.
// `linkTo` : « refurbished » pour que les cartes mènent droit aux reconditionnés ;
// « deal » (page Affaires) pour qu'elles mènent à la page où est l'affaire.
export default function ProductGrid({
  products,
  wide = false,
  linkTo,
}: {
  products: ProductCardData[];
  wide?: boolean;
  linkTo?: LinkTo;
}) {
  return (
    <ul className={`grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 ${wide ? "lg:grid-cols-6" : "lg:grid-cols-4"}`}>
      {products.map((product) => (
        <li key={product.id} className="flex">
          <ProductCard
            product={product}
            href={cardHref(product, linkTo)}
            sizes={wide ? "(min-width: 1024px) 180px, (min-width: 768px) 33vw, 50vw" : "(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"}
          />
        </li>
      ))}
    </ul>
  );
}
