import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEVICE_KINDS } from "@/config/catalog";
import ProductGrid from "@/features/products/ProductGrid";
import Breadcrumb from "@/features/shop/Breadcrumb";
import ChoicePoster from "@/features/shop/ChoicePoster";
import { colorColumns, conditionColumns } from "@/features/shop/choiceColumns";
import { productStep } from "@/features/shop/colors";
import NewPicker from "@/features/shop/NewPicker";
import ProductFacts from "@/features/shop/ProductFacts";
import ProductHeader, { productCrumbs } from "@/features/shop/ProductHeader";
import { formatPrice } from "@/lib/format";
import { getPalette } from "@/lib/palette";
import { getProduct } from "@/lib/products";
import { publicFetchPage } from "@/lib/publicFetch";
import type { ProductCard } from "@/types/api";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) {
    return { title: "Produit introuvable" };
  }
  const description = `${product.name} à partir de ${formatPrice(product.minPrice)}. ${product.description.slice(0, 120)}`;
  const photo = product.images[0]?.url;
  return {
    title: product.name,
    description,
    // ?couleur=… affiche la même fiche : les moteurs gardent une seule adresse.
    alternates: { canonical: `/produits/${product.slug}` },
    // openGraph remplace celui du layout en entier : siteName et locale sont repris ici.
    openGraph: {
      type: "website",
      locale: "fr_DZ",
      siteName: "DropZone (démo)",
      title: product.name,
      description,
      url: `/produits/${product.slug}`,
      ...(photo ? { images: [{ url: photo, alt: product.name }] } : {}),
    },
  };
}

// La page d'un produit. Appareil : l'affiche de choix (05/11), d'abord la couleur, puis
// Neuf scellé ou Affaire dans cette couleur (`?couleur=Glacier`), au style de l'affiche de la
// série, avec les caractéristiques dessous. Accessoire (vendu neuf) : le choix des options et
// l'achat, directement.
export default async function ProductPage({ params, searchParams }: PageProps<"/produits/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) {
    notFound();
  }
  const isDevice = DEVICE_KINDS.includes(product.category.kind);
  const search = await searchParams;
  const step = productStep(product, search.couleur);
  // Les options d'une colonne d'affiche d'accessoire (« ?Puissance=45%20W »), choisies d'avance.
  const requested = Object.fromEntries(
    Object.entries(search).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  // Sous un appareil : les accessoires compatibles avec son modèle. La palette : les lueurs
  // de l'affiche et les pastilles des couleurs d'un accessoire (NewPicker).
  const [relatedPage, palette] = await Promise.all([
    product.deviceModel
      ? publicFetchPage<ProductCard>(`/products?model=${product.deviceModel.slug}&limit=8`)
      : Promise.resolve(null),
    getPalette(),
  ]);
  const related = relatedPage?.data ?? [];
  const accessories = related.filter((item) => item.id !== product.id).slice(0, 4);

  const accessoriesSection =
    accessories.length > 0 ? (
      <section aria-labelledby="accessories" className="mt-14 space-y-4">
        <h2 id="accessories" className="text-2xl">
          Pour protéger votre {product.deviceModel?.name}
        </h2>
        <ProductGrid products={accessories} />
      </section>
    ) : null;

  if (!isDevice) {
    return (
      <div className="container-page py-8">
        <ProductHeader product={product}>
          <NewPicker variants={product.variants} kind={product.category.kind} palette={palette} requested={requested} />
          <ProductFacts product={product} />
        </ProductHeader>
        {accessoriesSection}
      </div>
    );
  }

  const color = step.kind === "conditions" ? step.color : null;
  return (
    <div className="container-page space-y-4 py-4">
      <Breadcrumb items={productCrumbs(product, color)} />
      {step.kind === "colors" ? (
        <ChoicePoster kicker="CHOISISSEZ LA COULEUR" title={product.name} columns={colorColumns(product)} palette={palette} />
      ) : (
        <ChoicePoster
          kicker="NEUF SCELLÉ OU AFFAIRE"
          title={color ? `${product.name} · ${color}` : product.name}
          columns={conditionColumns(product, color)}
          palette={palette}
        />
      )}
      {color ? (
        <Link href={`/produits/${product.slug}`} className="inline-block text-sm text-blue-ink underline">
          Choisir une autre couleur
        </Link>
      ) : null}
      <ProductFacts product={product} />
      {accessoriesSection}
    </div>
  );
}
