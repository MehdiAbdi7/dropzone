import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import ColorViewer from "@/features/shop/ColorViewer";
import ProductFacts from "@/features/shop/ProductFacts";
import { ProductJourney } from "@/features/shop/ProductJourney";
import ShopBackdrop from "@/features/shop/ShopBackdrop";
import { getPalette } from "@/lib/palette";
import { getProduct } from "@/lib/products";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]/couleurs">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product ? `${product.name}, toutes les couleurs` : "Produit introuvable" };
}

// La page de référence des couleurs (25/11, demande de Mehdi) : voir un modèle dans toutes ses couleurs, sans
// avoir choisi Neuf ni Occasion et sans rien acheter. On y arrive par les pastilles de couleur de l'affiche de
// la série (`?apercu=` : la couleur à montrer). L'état est inconnu : la visionneuse montre le neuf et l'occasion
// côte à côte, chacun avec son lien vers la fiche de la couleur. Un accessoire, ou un modèle sans couleurs,
// n'a pas cette page : retour à la page du produit.
export default async function ColorsPage({ params, searchParams }: PageProps<"/produits/[slug]/couleurs">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  if (!DEVICE_KINDS.includes(product.category.kind) || product.colors.length === 0) {
    redirect(`/produits/${slug}`);
  }
  const palette = await getPalette();
  const search = await searchParams;
  return (
    <ShopBackdrop contentMax={1200}>
      <div className="container-page space-y-4 py-4">
        {/* Étape Couleur du parcours, l'état n'étant pas encore choisi : « Au choix ». */}
        <ProductJourney product={product} current="color" condition={null} color={null} />
        <ColorViewer
          product={product}
          condition={null}
          palette={palette}
          params={{ preview: search.apercu, couleur: search.couleur, etat: search.etat }}
        />
        <ProductFacts product={product} />
      </div>
    </ShopBackdrop>
  );
}
