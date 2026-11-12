import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AccessoryPoster from "@/features/shop/AccessoryPoster";
import Breadcrumb from "@/features/shop/Breadcrumb";
import SeriesPoster from "@/features/shop/SeriesPoster";
import { getPalette } from "@/lib/palette";
import { publicFetch } from "@/lib/publicFetch";
import type { AccessoryPoster as AccessoryPage, Category, SeriesPoster as Poster } from "@/types/api";

// Les catégories répondent si l'API est en marche, ce qui distingue une page inconnue (404) d'une
// API arrêtée (message). Dans une catégorie d'accessoires (12/11), le troisième morceau de
// l'adresse est une marque d'accessoires (Anker) ; sinon, une série d'appareils (iPhone 18).
async function getPage(categorie: string, marque: string, serie: string) {
  const categories = await publicFetch<Category[]>("/categories");
  if (categories?.find((item) => item.slug === categorie)?.kind === "accessory") {
    const accessory = await publicFetch<AccessoryPage>(`/accessories/${categorie}/${marque}/${serie}`);
    return { categories, poster: null, accessory };
  }
  const poster = await publicFetch<Poster>(`/series/${categorie}/${marque}/${serie}`);
  return { categories, poster, accessory: null };
}

export async function generateMetadata({
  params,
}: PageProps<"/boutique/[categorie]/[marque]/[serie]">): Promise<Metadata> {
  const { categorie, marque, serie } = await params;
  const { poster, accessory } = await getPage(categorie, marque, serie);
  if (accessory) {
    return { title: `${accessory.maker.name} · ${accessory.type.name}` };
  }
  return {
    title: poster ? `${poster.name} · ${poster.category.name}` : "Boutique",
  };
}

const UNAVAILABLE = (
  <div className="container-page py-8">
    <p role="alert" className="card p-6">
      La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
    </p>
  </div>
);

// Étape 4 du parcours. Appareils : l'affiche de la série, avec tous ses modèles ; un clic sur un
// modèle mène à sa fiche, l'étape Neuf scellé ou Affaire. Accessoires : une affiche par produit de
// la marque, une colonne par variante.
export default async function ShopSeriesPage({
  params,
}: PageProps<"/boutique/[categorie]/[marque]/[serie]">) {
  const { categorie, marque, serie } = await params;
  const { categories, poster, accessory } = await getPage(categorie, marque, serie);
  if (categories && !poster && !accessory) {
    notFound();
  }
  // Les teintes des couleurs (Listes du back-office) : lueurs et pastilles de l'affiche.
  const palette = await getPalette();

  if (accessory) {
    const typeHref = `/boutique/${accessory.category.slug}/${accessory.type.slug}`;
    return (
      <div className="container-page space-y-6 py-8">
        <Breadcrumb
          items={[
            { label: "Boutique", href: "/boutique" },
            { label: accessory.category.name, href: `/boutique/${accessory.category.slug}` },
            { label: accessory.type.name, href: typeHref },
            { label: accessory.maker.name },
          ]}
        />
        <header className="space-y-1">
          <h1 className="text-3xl">
            {accessory.type.name} {accessory.maker.name}
          </h1>
          <p className="text-ink-muted">
            {accessory.products.length} produit{accessory.products.length > 1 ? "s" : ""}. Choisis ta référence : un clic sur une
            colonne ouvre la fiche, déjà réglée.
          </p>
        </header>
        <div className="space-y-6">
          {accessory.products.map((product, index) => (
            <AccessoryPoster key={product.slug} product={product} makerName={accessory.maker.name} palette={palette} priority={index === 0} />
          ))}
        </div>
      </div>
    );
  }

  if (!poster) {
    return UNAVAILABLE;
  }

  const brandHref = `/boutique/${poster.category.slug}/${poster.brand.slug}`;
  return (
    <div className="container-page space-y-4 py-4">
      <Breadcrumb
        items={[
          { label: "Boutique", href: "/boutique" },
          {
            label: poster.category.name,
            href: `/boutique/${poster.category.slug}`,
          },
          { label: poster.brand.name, href: brandHref },
          { label: poster.name },
        ]}
      />
      <SeriesPoster poster={poster} palette={palette} />
    </div>
  );
}
