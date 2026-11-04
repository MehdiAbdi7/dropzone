import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CONDITION_LABELS } from "@/config/catalog";
import ProductHeader from "@/features/shop/ProductHeader";
import RefurbishedList from "@/features/shop/RefurbishedList";
import { getPalette } from "@/lib/palette";
import { getProduct } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]/affaire">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name} en affaire` : "Produit introuvable" };
}

// Étape 5b du parcours : les affaires en stock, une radiographie par appareil.
// L'ancienne adresse `/reconditionne` y renvoie (next.config.ts).
export default async function DealProductPage({ params }: PageProps<"/produits/[slug]/affaire">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  // L'API ne renvoie que les affaires encore en stock.
  const refurbished = product.variants.filter((variant) => variant.condition === "refurbished");
  // Rien en stock : la carte « Affaire » est barrée ; une adresse tapée à la main
  // revient à la page du modèle.
  if (refurbished.length === 0) {
    redirect(`/produits/${slug}`);
  }
  const palette = await getPalette();

  return (
    <div className="container-page py-8">
      <ProductHeader product={product} step={CONDITION_LABELS.refurbished}>
        <RefurbishedList variants={refurbished} kind={product.category.kind} palette={palette} />
      </ProductHeader>
    </div>
  );
}
