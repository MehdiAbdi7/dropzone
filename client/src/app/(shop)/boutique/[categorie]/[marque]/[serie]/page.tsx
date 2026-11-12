import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Breadcrumb from "@/features/shop/Breadcrumb";
import SeriesPoster from "@/features/shop/SeriesPoster";
import { accessoryRedirect } from "@/lib/legacyRedirect";
import { getPalette } from "@/lib/palette";
import { publicFetch } from "@/lib/publicFetch";
import type { Category, SeriesPoster as Poster } from "@/types/api";

// Les catégories répondent si l'API est en marche, ce qui distingue une page inconnue (404) d'une
// API arrêtée (message). Dans une catégorie d'accessoires, c'était l'affiche d'une marque
// (12/11) : la refonte du 12/11 l'a remplacée par la page à filtres, l'adresse y mène.
async function getPage(categorie: string, marque: string, serie: string) {
  const categories = await publicFetch<Category[]>("/categories");
  const accessory = categories?.find((item) => item.slug === categorie)?.kind === "accessory";
  const poster = accessory ? null : await publicFetch<Poster>(`/series/${categorie}/${marque}/${serie}`);
  return { categories, accessory, poster };
}

export async function generateMetadata({
  params,
}: PageProps<"/boutique/[categorie]/[marque]/[serie]">): Promise<Metadata> {
  const { categorie, marque, serie } = await params;
  const { poster } = await getPage(categorie, marque, serie);
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

// L'affiche de la série, avec tous ses modèles ; un clic sur un modèle mène à sa fiche, l'étape
// Neuf scellé ou Affaire.
export default async function ShopSeriesPage({
  params,
}: PageProps<"/boutique/[categorie]/[marque]/[serie]">) {
  const { categorie, marque, serie } = await params;
  const { categories, accessory, poster } = await getPage(categorie, marque, serie);
  if (accessory) {
    redirect(accessoryRedirect(categorie, marque, serie));
  }
  if (categories && !poster) {
    notFound();
  }
  if (!poster) {
    return UNAVAILABLE;
  }
  // Les teintes des couleurs (Listes du back-office) : lueurs et pastilles de l'affiche.
  const palette = await getPalette();

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
