import Link from "next/link";
import ModelsSection from "@/features/admin/catalog/ModelsSection";

export const metadata = { title: "Tous les modèles" };

// Tous les modèles d'appareils, rangés ou non : recherche, année, ajout, suppression.
export default function AllModelsPage() {
  return (
    <div className="space-y-6">
      <Link href="/admin/catalogue" className="text-sm text-blue-ink underline">
        Catalogue
      </Link>
      <h1 className="text-3xl">Tous les modèles</h1>
      <ModelsSection />
    </div>
  );
}
