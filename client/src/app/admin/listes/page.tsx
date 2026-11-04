import ChoicesSection from "@/features/admin/ChoicesSection";

export const metadata = { title: "Listes" };

// Les listes à cocher du formulaire produit : couleurs, stockages, défauts…
export default function ListsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl">Listes</h1>
      <ChoicesSection />
    </div>
  );
}
