import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductImage from "@/components/ui/ProductImage";
import ProductGrid from "@/features/products/ProductGrid";
import ProductPurchase from "@/features/products/ProductPurchase";
import { SPEC_ORDER } from "@/config/catalog";
import { formatPrice, orderedEntries } from "@/lib/format";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { ProductCard, ProductDetail } from "@/types/api";

// Le même appel sert à generateMetadata et à la page : Next le déduplique.
async function getProduct(slug: string) {
  return publicFetch<ProductDetail>(`/products/${encodeURIComponent(slug)}`, 60);
}

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

export default async function ProductPage({ params }: PageProps<"/produits/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) {
    notFound();
  }

  // Sous un appareil : les accessoires compatibles avec son modèle.
  const related = product.deviceModel
    ? ((await publicFetchPage<ProductCard>(`/products?model=${product.deviceModel.slug}&limit=8`, 300))?.data ?? [])
    : [];
  const accessories = related.filter((item) => item.id !== product.id).slice(0, 4);
  const specs = orderedEntries(product.specs, SPEC_ORDER);

  return (
    <div className="container-page py-8">
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-ink-muted">
        <Link href="/produits" className="hover:text-ink">
          Produits
        </Link>
        {" / "}
        <Link href={`/produits?category=${product.category.slug}`} className="hover:text-ink">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="card relative aspect-square overflow-hidden bg-surface-2">
            <ProductImage src={product.images[0]?.url ?? null} alt={product.name} sizes="(min-width: 1024px) 480px, 100vw" priority />
          </div>
          {product.images.length > 1 ? (
            <ul className="grid grid-cols-4 gap-2">
              {product.images.slice(1).map((image) => (
                <li key={image.id} className="card relative aspect-square overflow-hidden bg-surface-2">
                  <ProductImage src={image.url} alt="" sizes="120px" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-6">
          <header className="space-y-2">
            {product.deviceModel ? (
              <p className="text-sm font-semibold text-ink-muted">{product.deviceModel.brand}</p>
            ) : null}
            <h1 className="text-3xl sm:text-4xl">{product.name}</h1>
            <p className="max-w-prose text-ink-muted">{product.description}</p>
          </header>

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

          <ProductPurchase variants={product.variants} />

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
        </div>
      </div>

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
