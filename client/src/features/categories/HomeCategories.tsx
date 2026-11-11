import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";
import CategoryCarousel from "./CategoryCarousel";
import { homeCategories } from "./tiles";

// Les catégories de l'accueil : lues dans l'API, montrées dans le carrousel. Une catégorie créée
// dans le back-office y apparaît toute seule, avec la composition de photos réglée dans
// Personnalisation ; une catégorie sans produit publié n'y figure pas.
export default async function HomeCategories() {
  const categories = await publicFetch<Category[]>("/categories");
  if (!categories) {
    return (
      <p role="alert" className="card p-6">
        Les catégories ne répondent pas pour le moment. Rechargez la page dans quelques secondes.
      </p>
    );
  }
  return <CategoryCarousel categories={homeCategories(categories)} />;
}
