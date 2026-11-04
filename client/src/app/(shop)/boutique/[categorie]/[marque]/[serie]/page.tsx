import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/features/shop/Breadcrumb";
import SeriesPoster from "@/features/shop/SeriesPoster";
import { publicFetch } from "@/lib/publicFetch";
import type { Category, SeriesPoster as Poster } from "@/types/api";

// L'affiche et les catégories : les catégories répondent si l'API est en marche, ce qui
// distingue une série inconnue (404) d'une API arrêtée (message).
async function getPoster(categorie: string, marque: string, serie: string) {
  const [categories, poster] = await Promise.all([
    publicFetch<Category[]>("/categories", 300),
    publicFetch<Poster>(`/series/${categorie}/${marque}/${serie}`, 60),
  ]);
  return { categories, poster };
}

export async function generateMetadata({ params }: PageProps<"/boutique/[categorie]/[marque]/[serie]">): Promise<Metadata> {
  const { categorie, marque, serie } = await params;
  const { poster } = await getPoster(categorie, marque, serie);
  return { title: poster ? `${poster.name} · ${poster.category.name}` : "Boutique" };
}

// Étape 4 du parcours : l'affiche de la série, avec tous ses modèles. Un clic sur un
// modèle mène à sa fiche, l'étape Neuf scellé ou Affaire.
export default async function ShopSeriesPage({ params }: PageProps<"/boutique/[categorie]/[marque]/[serie]">) {
  const { categorie, marque, serie } = await params;
  const { categories, poster } = await getPoster(categorie, marque, serie);
  if (categories && !poster) {
    notFound();
  }
  if (!poster) {
    return (
      <div className="container-page py-8">
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      </div>
    );
  }

  const brandHref = `/boutique/${poster.category.slug}/${poster.brand.slug}`;
  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb
        items={[
          { label: "Boutique", href: "/boutique" },
          { label: poster.category.name, href: `/boutique/${poster.category.slug}` },
          { label: poster.brand.name, href: brandHref },
          { label: poster.name },
        ]}
      />
      <SeriesPoster poster={poster} />
    </div>
  );
}
