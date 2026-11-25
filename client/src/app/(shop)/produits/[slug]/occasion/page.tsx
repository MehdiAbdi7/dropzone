import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CONDITION_LABELS, DEVICE_KINDS } from "@/config/catalog";
import { imageOf } from "@/features/shop/choiceColumns";
import ColorStep from "@/features/shop/ColorStep";
import { ofColor, productStep } from "@/features/shop/colors";
import ProductFacts from "@/features/shop/ProductFacts";
import ProductHeader from "@/features/shop/ProductHeader";
import { ProductJourney } from "@/features/shop/ProductJourney";
import RefurbishedList from "@/features/shop/RefurbishedList";
import ShopBackdrop from "@/features/shop/ShopBackdrop";
import { getPalette } from "@/lib/palette";
import { getProduct } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]/occasion">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name} d'occasion` : "Produit introuvable" };
}

// Les occasions (ordre inversé et « Affaire » renommé « Occasion » le 23/11) : on arrive ici depuis la carte
// « Occasion » de la page du modèle. Un appareil à couleurs passe d'abord par l'étape Couleur ; avec `?couleur=`, les
// occasions de cette couleur, une radiographie par appareil. Les anciennes adresses `/affaire` et `/reconditionne` y
// renvoient (next.config.ts).
export default async function UsedProductPage({ params, searchParams }: PageProps<"/produits/[slug]/occasion">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  // L'API ne renvoie que les occasions encore en stock.
  const used = product.variants.filter((variant) => variant.condition === "refurbished");
  // Rien en stock : la carte « Occasion » est barrée ; une adresse tapée à la main revient à la page du modèle.
  if (!DEVICE_KINDS.includes(product.category.kind) || used.length === 0) {
    redirect(`/produits/${slug}`);
  }
  const palette = await getPalette();
  const step = productStep(product, (await searchParams).couleur);
  if (step.kind === "colors") {
    return <ColorStep product={product} condition="refurbished" palette={palette} />;
  }
  const ofThisColor = step.color ? ofColor(used, step.color) : used;
  // Une couleur sans occasion (adresse tapée à la main, ou vendue entre-temps) : retour au choix des couleurs.
  if (ofThisColor.length === 0) {
    redirect(`/produits/${slug}/occasion`);
  }
  // La photo de la couleur choisie (sinon l'icône), jamais celle d'une autre couleur.
  const photo = step.color ? imageOf(product, step.color) : null;

  return (
    <ShopBackdrop contentMax={1200}>
      <div className="container-page py-8">
        <ProductHeader
          product={product}
          step={CONDITION_LABELS.refurbished}
          stepHref={`/produits/${slug}/occasion`}
          color={step.color}
          image={photo}
          journey={<ProductJourney product={product} current="end" condition="refurbished" color={step.color} />}
        >
          <RefurbishedList variants={ofThisColor} kind={product.category.kind} palette={palette} />
          <ProductFacts product={product} />
        </ProductHeader>
      </div>
    </ShopBackdrop>
  );
}
