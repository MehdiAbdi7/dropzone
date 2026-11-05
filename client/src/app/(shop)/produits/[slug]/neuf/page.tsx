import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CONDITION_LABELS, DEVICE_KINDS } from "@/config/catalog";
import { colorHref, ofColor, productStep } from "@/features/shop/colors";
import NewPicker from "@/features/shop/NewPicker";
import ProductFacts from "@/features/shop/ProductFacts";
import ProductHeader from "@/features/shop/ProductHeader";
import { getPalette } from "@/lib/palette";
import { getProduct } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]/neuf">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name} neuf scellé` : "Produit introuvable" };
}

// Étape 5a du parcours : le neuf scellé, avec ce qui reste dans chaque option. Après
// l'étape Couleur (`?couleur=`), seulement les neufs de cette couleur, et le stockage.
export default async function NewProductPage({ params, searchParams }: PageProps<"/produits/[slug]/neuf">) {
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
  const fresh = (step.color ? ofColor(product.variants, step.color) : product.variants).filter(
    (variant) => variant.condition === "new",
  );
  // Un accessoire s'achète sur sa fiche ; sans neuf en stock, la carte « Neuf » est barrée :
  // une adresse tapée à la main revient à l'étape d'avant.
  if (!DEVICE_KINDS.includes(product.category.kind) || !fresh.some((variant) => variant.stock > 0)) {
    redirect(step.color ? colorHref(slug, step.color) : `/produits/${slug}`);
  }
  const palette = await getPalette();
  const photo = step.color ? (product.colors.find((color) => color.name === step.color)?.photoUrl ?? null) : null;

  return (
    <div className="container-page py-8">
      <ProductHeader product={product} step={CONDITION_LABELS.new} color={step.color} image={photo}>
        <NewPicker variants={fresh} kind={product.category.kind} palette={palette} colorChosen={step.color !== null} />
        <ProductFacts product={product} />
      </ProductHeader>
    </div>
  );
}
