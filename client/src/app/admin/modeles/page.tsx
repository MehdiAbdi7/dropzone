import { redirect } from "next/navigation";

// Ancienne page « Modèles et listes » : les modèles sont passés dans le Catalogue,
// les listes à cocher dans « Listes ».
export default function OldModelsPage() {
  redirect("/admin/listes");
}
