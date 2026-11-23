import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CONDITION_LABELS, DEVICE_KINDS } from "@/config/catalog";
import { imageOf } from "@/features/shop/choiceColumns";
import ColorStep from "@/features/shop/ColorStep";
import { ofColor, productStep } from "@/features/shop/colors";
import NewPicker from "@/features/shop/NewPicker";
import ProductFacts from "@/features/shop/ProductFacts";
import ProductHeader from "@/features/shop/ProductHeader";
import { getPalette } from "@/lib/palette";
import { getProduct } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]/neuf">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name} neuf scellé` : "Produit introuvable" };
}

// Le neuf scellé (ordre inversé le 23/11) : on arrive ici depuis la carte « Neuf scellé » de la page du modèle. Un
// appareil à couleurs passe d'abord par l'étape Couleur ; avec `?couleur=`, les neufs de cette couleur et le stockage.
export default async function NewProductPage({ params, searchParams }: PageProps<"/produits/[slug]/neuf">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  const fresh = product.variants.filter((variant) => variant.condition === "new");
  // Un accessoire s'achète sur sa fiche ; sans neuf en stock, la carte « Neuf » est barrée : une adresse tapée à la
  // main revient à la page du modèle.
  if (!DEVICE_KINDS.includes(product.category.kind) || !fresh.some((variant) => variant.stock > 0)) {
    redirect(`/produits/${slug}`);
  }
  const palette = await getPalette();
  const step = productStep(product, (await searchParams).couleur);
  if (step.kind === "colors") {
    return <ColorStep product={product} condition="new" palette={palette} />;
  }
  const ofThisColor = step.color ? ofColor(fresh, step.color) : fresh;
  // Une couleur sans neuf (adresse tapée à la main, ou vendue entre-temps) : retour au choix des couleurs.
  if (!ofThisColor.some((variant) => variant.stock > 0)) {
    redirect(`/produits/${slug}/neuf`);
  }
  // La photo de la couleur choisie (sinon l'icône), jamais celle d'une autre couleur.
  const photo = step.color ? imageOf(product, step.color) : null;

  return (
    <div className="container-page py-8">
      <ProductHeader product={product} step={CONDITION_LABELS.new} stepHref={`/produits/${slug}/neuf`} color={step.color} image={photo}>
        <NewPicker variants={ofThisColor} kind={product.category.kind} palette={palette} colorChosen={step.color !== null} />
        <ProductFacts product={product} />
      </ProductHeader>
    </div>
  );
}
