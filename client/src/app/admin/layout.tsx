import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import NewOrderAlert from "@/features/admin/alerts/NewOrderAlert";
import AdminNav, { AdminBottomNav } from "@/features/admin/AdminNav";
import AdminSubNav from "@/features/admin/AdminSubNav";
import AdminTopbar from "@/features/admin/AdminTopbar";
import { getCurrentUser } from "@/lib/serverFetch";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s · Back-office DropZone" },
};

// Deuxième couche : un client connecté n'entre pas. La troisième, l'API, refuse
// de toute façon toute route /admin sans le rôle admin (403).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/connexion?suite=/admin");
  }
  if (user.role !== "admin") {
    redirect("/compte");
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* La barre du haut (logo, boutique, menu ☰) reste collée en haut, comme sur Niwa (14/11). */}
      <AdminTopbar />
      {/* L'alerte des nouvelles commandes (son et bannière), sur toutes les pages du back-office. */}
      <NewOrderAlert />
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Sur ordinateur, la barre latérale (les sept sections) reste en place pendant le
            défilement : sticky sous la barre du haut, avec son propre défilement si besoin.
            Sur téléphone et tablette, la navigation est dans la barre du bas (AdminBottomNav). */}
        <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:w-60 lg:shrink-0 lg:self-start lg:overflow-y-auto">
          <AdminNav />
        </aside>
        {/* pb-24 sous lg : la barre du bas ne cache pas la fin de la page. */}
        <main id="contenu" className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 hero-glow">
          {/* useSearchParams exige un Suspense : les onglets se lisent côté navigateur. */}
          <Suspense>
            <AdminSubNav />
          </Suspense>
          {children}
        </main>
        <AdminBottomNav />
      </div>
    </div>
  );
}
