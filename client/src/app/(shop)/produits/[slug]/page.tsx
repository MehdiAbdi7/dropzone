import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEVICE_KINDS, SPEC_ORDER } from "@/config/catalog";
import ProductGrid from "@/features/products/ProductGrid";
import ConditionChoice from "@/features/shop/ConditionChoice";
import NewPicker from "@/features/shop/NewPicker";
import ProductHeader from "@/features/shop/ProductHeader";
import { formatPrice, orderedEntries } from "@/lib/format";
import { getPalette } from "@/lib/palette";
import { getProduct } from "@/lib/products";
import { publicFetchPage } from "@/lib/publicFetch";
import type { ProductCard } from "@/types/api";

export async function generateMetadata({ params }: PageProps<"/produits/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) {
    return { title: "Produit introuvable" };
  }
  return {
    title: product.name,
    description: `${product.name} à partir de ${formatPrice(product.minPrice)}. ${product.description.slice(0, 120)}`,
  };
}

// La page d'un produit. Appareil : étape 4 du parcours, neuf ou reconditionné.
// Accessoire ou audiovisuel (vendus neufs) : le choix des options et l'achat, directement.
export default async function ProductPage({ params }: PageProps<"/produits/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) {
    notFound();
  }
  const isDevice = DEVICE_KINDS.includes(product.category.kind);

  // Sous un appareil : les accessoires compatibles avec son modèle. La palette : les
  // pastilles des couleurs d'un accessoire (NewPicker).
  const [relatedPage, palette] = await Promise.all([
    product.deviceModel
      ? publicFetchPage<ProductCard>(`/products?model=${product.deviceModel.slug}&limit=8`, 300)
      : Promise.resolve(null),
    getPalette(),
  ]);
  const related = relatedPage?.data ?? [];
  const accessories = related.filter((item) => item.id !== product.id).slice(0, 4);
  const specs = orderedEntries(product.specs, SPEC_ORDER);

  return (
    <div className="container-page py-8">
      <ProductHeader product={product}>
        <p className="max-w-prose text-ink-muted">{product.description}</p>

        {product.compatibleModels.length > 0 ? (
          <p className="text-sm">
            <span className="font-semibold">Compatible avec : </span>
            {product.compatibleModels.map((model, index) => (
              <span key={model.slug}>
                {index > 0 ? ", " : ""}
                <Link href={`/produits?model=${model.slug}`} className="text-blue-ink underline">
                  {model.name}
                </Link>
              </span>
            ))}
          </p>
        ) : null}

        {isDevice ? (
          <ConditionChoice slug={product.slug} image={product.images[0]?.url ?? null} variants={product.variants} />
        ) : (
          <NewPicker variants={product.variants} kind={product.category.kind} palette={palette} />
        )}

        {specs.length > 0 ? (
          <section aria-labelledby="specs" className="space-y-3">
            <h2 id="specs" className="text-xl">
              Caractéristiques
            </h2>
            <dl className="card divide-y divide-line">
              {specs.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-sm">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </ProductHeader>

      {accessories.length > 0 ? (
        <section aria-labelledby="accessories" className="mt-14 space-y-4">
          <h2 id="accessories" className="text-2xl">
            Pour protéger votre {product.deviceModel?.name}
          </h2>
          <ProductGrid products={accessories} />
        </section>
      ) : null}
    </div>
  );
}
