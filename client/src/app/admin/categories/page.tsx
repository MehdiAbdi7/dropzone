import { redirect } from "next/navigation";

// Ancienne page « Catégories » : les catégories et leurs marques sont dans le Catalogue.
export default function OldCategoriesPage() {
  redirect("/admin/catalogue");
}
