import type { ProductCard as ProductCardData } from "@/types/api";
import ProductCard from "./ProductCard";

// `wide` : 6 colonnes sur grand écran (l'accueil) ; sinon 4, comme le catalogue.
// `sizes` dit au navigateur la largeur réelle des images, pour le jour des photos.
// `linkTo` : « refurbished » pour que les cartes mènent droit aux radiographies des affaires.
export default function ProductGrid({
  products,
  wide = false,
  linkTo,
}: {
  products: ProductCardData[];
  wide?: boolean;
  linkTo?: "refurbished";
}) {
  return (
    <ul
      className={`grid grid-cols-2 gap-3 sm:gap-1 md:grid-cols-3 ${wide ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
    >
      {products.map((product) => (
        <li key={product.arrivalVariantId ?? product.id} className="flex">
          <ProductCard
            product={product}
            href={
              linkTo === "refurbished"
                ? `/produits/${product.slug}/affaire`
                : undefined
            }
            sizes={
              wide
                ? "(min-width: 1024px) 180px, (min-width: 768px) 33vw, 50vw"
                : "(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
            }
          />
        </li>
      ))}
    </ul>
  );
}
