import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CONDITION_LABELS } from "@/config/catalog";
import { colorHref, ofColor, productStep } from "@/features/shop/colors";
import ProductFacts from "@/features/shop/ProductFacts";
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
// Après l'étape Couleur (`?couleur=`), seulement les appareils de cette couleur.
export default async function DealProductPage({ params, searchParams }: PageProps<"/produits/[slug]/affaire">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  const step = productStep(product, (await searchParams).couleur);
  // Un modèle à couleurs sans couleur valide dans l'adresse (ancien lien) : l'étape Couleur.
  if (step.kind === "colors") {
    redirect(`/produits/${slug}`);
  }
  // L'API ne renvoie que les affaires encore en stock.
  const refurbished = (step.color ? ofColor(product.variants, step.color) : product.variants).filter(
    (variant) => variant.condition === "refurbished",
  );
  // Rien en stock : la carte « Affaire » est barrée ; une adresse tapée à la main
  // revient à l'étape d'avant.
  if (refurbished.length === 0) {
    redirect(step.color ? colorHref(slug, step.color) : `/produits/${slug}`);
  }
  const palette = await getPalette();
  const photo = step.color ? (product.colors.find((color) => color.name === step.color)?.photoUrl ?? null) : null;

  return (
    <div className="container-page py-8">
      <ProductHeader product={product} step={CONDITION_LABELS.refurbished} color={step.color} image={photo}>
        <RefurbishedList variants={refurbished} kind={product.category.kind} palette={palette} />
        <ProductFacts product={product} />
      </ProductHeader>
    </div>
  );
}
