import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ProductHeader from "@/features/shop/ProductHeader";
import RefurbishedList from "@/features/shop/RefurbishedList";
import { getProduct } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]/reconditionne">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name} reconditionné` : "Produit introuvable" };
}

// Étape 5b du parcours : les reconditionnés en stock, une radiographie par appareil.
export default async function RefurbishedProductPage({ params }: PageProps<"/produits/[slug]/reconditionne">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  // L'API ne renvoie que les reconditionnés encore en stock.
  const refurbished = product.variants.filter((variant) => variant.condition === "refurbished");
  // Rien en stock : la carte « Reconditionné » est barrée ; une adresse tapée à la main
  // revient à la page du modèle.
  if (refurbished.length === 0) {
    redirect(`/produits/${slug}`);
  }

  return (
    <div className="container-page py-8">
      <ProductHeader product={product} step="Reconditionné">
        <RefurbishedList variants={refurbished} kind={product.category.kind} />
      </ProductHeader>
    </div>
  );
}
