import Link from "next/link";
import ConditionReport from "@/features/products/ConditionReport";
import ProductGrid from "@/features/products/ProductGrid";
import { publicFetch, publicFetchPage } from "@/lib/publicFetch";
import type { Category, ProductCard, ProductDetail } from "@/types/api";

// Les modèles que les clients de DropZone demandent le plus souvent.
const POPULAR_MODELS = [
  { slug: "apple-iphone-15-pro-max", label: "iPhone 15 Pro Max" },
  { slug: "apple-iphone-13", label: "iPhone 13" },
  { slug: "samsung-galaxy-s24-ultra", label: "Galaxy S24 Ultra" },
  { slug: "apple-macbook-air-13-pouces-m2", label: "MacBook Air M2" },
  { slug: "apple-watch-series-9", label: "Apple Watch Series 9" },
];

const FAMILIES = [
  {
    title: "Limitations",
    color: "text-red",
    text: "Ce que l'appareil ne fait pas, par exemple « Wi-Fi seulement ». Toujours affiché en premier, et à accepter avant de commander.",
  },
  {
    title: "Pièces remplacées",
    color: "text-blue-ink",
    text: "Caméra, batterie ou écran changés : ils fonctionnent, mais ne sont pas d'origine. On vous le dit.",
  },
  {
    title: "Défauts visibles",
    color: "text-amber",
    text: "Une rayure, un cache arrière fissuré : rien qui gêne l'usage, souvent invisible sous une coque.",
  },
];

export default async function HomePage() {
  const [latest, refurbished, categories] = await Promise.all([
    publicFetchPage<ProductCard>("/products?limit=8", 60),
    publicFetchPage<ProductCard>("/products?category=smartphones&condition=reconditionne&limit=12", 60),
    publicFetch<Category[]>("/categories", 300),
  ]);

  // Un vrai reconditionné du stock, montré avec sa fiche d'état complète :
  // de préférence un smartphone vendu en affaire, le cas le plus parlant.
  const candidates = refurbished?.data ?? [];
  const showcaseSlug = (candidates.find((product) => product.hasDeal) ?? candidates[0])?.slug;
  const showcase = showcaseSlug ? await publicFetch<ProductDetail>(`/products/${showcaseSlug}`, 60) : null;
  const refurbishedUnits = showcase?.variants.filter((variant) => variant.condition === "refurbished") ?? [];
  // En vitrine : une affaire sans limitation, l'exemple le plus rassurant.
  const unit =
    refurbishedUnits.find((variant) => variant.gifts.length > 0 && variant.limitations.length === 0) ??
    refurbishedUnits.find((variant) => variant.limitations.length === 0) ??
    refurbishedUnits[0];

  return (
    <>
      <section className="border-b border-line">
        <div className="container-page grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-16">
          <div className="space-y-6">
            <h1 className="text-4xl leading-tight sm:text-5xl">
              Neuf ou reconditionné, chaque appareil est décrit pièce par pièce.
            </h1>
            <p className="max-w-xl text-lg text-ink-muted">
              Smartphones, PC portables et montres sélectionnés d&apos;Europe. Pour un reconditionné, vous voyez sa
              note, sa batterie et tout ce qui a été changé avant de commander. Paiement à la livraison.
            </p>
            <form action="/produits" role="search" className="flex max-w-xl gap-2">
              <label htmlFor="hero-search" className="sr-only">
                Quel modèle cherchez-vous ?
              </label>
              <input
                id="hero-search"
                name="q"
                type="search"
                className="input min-h-12 flex-1 text-base"
                placeholder="Quel modèle cherchez-vous ?"
              />
              <button type="submit" className="btn btn-primary min-h-12">
                Chercher
              </button>
            </form>
            <ul className="flex flex-wrap gap-2" aria-label="Modèles demandés">
              {POPULAR_MODELS.map((model) => (
                <li key={model.slug}>
                  <Link href={`/produits?model=${model.slug}`} className="chip">
                    {model.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {showcase && unit ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-muted">
                En stock en ce moment :{" "}
                <Link href={`/produits/${showcase.slug}`} className="font-semibold text-ink underline">
                  {showcase.name} reconditionné
                </Link>
              </p>
              <ConditionReport
                variant={unit}
                action={
                  <Link href={`/produits/${showcase.slug}`} className="btn btn-primary w-full">
                    {refurbishedUnits.length > 1
                      ? `Comparer les ${refurbishedUnits.length} appareils disponibles`
                      : "Voir l'appareil"}
                  </Link>
                }
              />
            </div>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="families" className="container-page py-12">
        <h2 id="families" className="text-2xl">
          Ce que dit la fiche d&apos;un reconditionné
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {FAMILIES.map((family) => (
            <div key={family.title} className="border-t-2 border-line pt-4">
              <h3 className={`text-lg ${family.color}`}>{family.title}</h3>
              <p className="mt-2 text-ink-muted">{family.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="latest" className="container-page space-y-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="latest" className="text-2xl">
            Nouvel arrivage
          </h2>
          <Link href="/produits" className="font-semibold text-blue-ink underline">
            Tout le catalogue
          </Link>
        </div>
        {latest ? (
          <ProductGrid products={latest.data} />
        ) : (
          <p role="alert" className="card p-6">
            Le catalogue ne répond pas pour le moment. Rechargez la page dans quelques secondes.
          </p>
        )}
      </section>

      {categories && categories.length > 0 ? (
        <section aria-labelledby="categories" className="container-page py-12">
          <h2 id="categories" className="text-2xl">
            Par catégorie
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/produits?category=${category.slug}`}
                  className="card flex items-baseline justify-between gap-3 p-4 hover:border-blue-ink"
                >
                  <span className="font-display text-lg font-bold">{category.name}</span>
                  <span className="text-sm text-ink-muted">{category.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
