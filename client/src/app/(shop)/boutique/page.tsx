import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { defaultCategory } from "@/features/categories/tiles";
import Breadcrumb from "@/features/shop/Breadcrumb";
import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";

export const metadata: Metadata = { title: "Boutique" };

// `/boutique` ouvre directement la catégorie qui a le plus de produits (11/11) : la barre des
// catégories de sa page permet d'aller dans les autres, un clic de moins qu'une page de choix.
// Le redirect est un 307 : si le catalogue change, la destination change avec lui.
export default async function ShopPage() {
  const categories = await publicFetch<Category[]>("/categories");
  const first = categories ? defaultCategory(categories) : undefined;
  if (first) {
    redirect(`/boutique/${first.slug}`);
  }

  return (
    <div className="container-page space-y-6 py-8">
      <Breadcrumb items={[{ label: "Boutique" }]} />
      {categories ? (
        <p className="card p-6">Aucun produit en vente pour le moment. Revenez bientôt.</p>
      ) : (
        <p role="alert" className="card p-6">
          La boutique ne répond pas pour le moment. Rechargez la page dans quelques secondes.
        </p>
      )}
    </div>
  );
}
