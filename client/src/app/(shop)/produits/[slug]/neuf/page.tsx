import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import NewOffers from "@/features/shop/NewOffers";
import ProductHeader from "@/features/shop/ProductHeader";
import { getProduct } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]/neuf">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name} neuf` : "Produit introuvable" };
}

// Étape 5a du parcours : le neuf. Les affaires neuves en haut, puis couleur et stockage,
// avec ce qui reste dans chaque option.
export default async function NewProductPage({ params }: PageProps<"/produits/[slug]/neuf">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  const fresh = product.variants.filter((variant) => variant.condition === "new");
  // Un accessoire s'achète sur sa fiche ; sans neuf en stock, la carte « Neuf » est barrée :
  // une adresse tapée à la main revient à la page du modèle.
  if (!DEVICE_KINDS.includes(product.category.kind) || !fresh.some((variant) => variant.stock > 0)) {
    redirect(`/produits/${slug}`);
  }

  return (
    <div className="container-page py-8">
      <ProductHeader product={product} step="Neuf">
        <NewOffers
          variants={fresh}
          kind={product.category.kind}
          image={product.images[0]?.url ?? null}
          regularTitle="Ou choisissez votre neuf"
        />
      </ProductHeader>
    </div>
  );
}
