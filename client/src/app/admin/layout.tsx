import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { canAccess, isBackOffice } from "@/features/admin/access";
import AdminGuard from "@/features/admin/AdminGuard";
import { AdminRoleProvider } from "@/features/admin/AdminRoleContext";
import NewOrderAlert from "@/features/admin/alerts/NewOrderAlert";
import AdminNav, { AdminBottomNav } from "@/features/admin/AdminNav";
import AdminSubNav from "@/features/admin/AdminSubNav";
import AdminTopbar from "@/features/admin/AdminTopbar";
import { getCurrentUser } from "@/lib/serverFetch";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s · Back-office DropZone" },
};

// Deuxième couche : un client connecté n'entre pas, et chaque rôle du personnel ne voit que ses pages
// (AdminGuard). La troisième, l'API, refuse de toute façon toute route que le rôle n'a pas (403).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/connexion?suite=/admin");
  }
  if (!isBackOffice(user.role)) {
    redirect("/compte");
  }

  return (
    <AdminRoleProvider role={user.role}>
      <div className="flex flex-1 flex-col">
        {/* La barre du haut (logo, boutique, menu ☰) reste collée en haut, comme sur Niwa (14/11). */}
        <AdminTopbar />
        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Sur ordinateur, la barre latérale (les sections permises au rôle) reste en place pendant le
              défilement : sticky sous la barre du haut, avec son propre défilement si besoin.
              Sur téléphone et tablette, la navigation est dans la barre du bas (AdminBottomNav). */}
          <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:w-60 lg:shrink-0 lg:self-start lg:overflow-y-auto">
            <AdminNav />
          </aside>
          {/* pb-24 sous lg : la barre du bas ne cache pas la fin de la page. */}
          <main id="contenu" className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 hero-glow">
            {/* L'alerte des nouvelles commandes (son et bannière), sur toutes les pages du back-office. Dans
                le contenu, collée sous la barre du haut quand on défile : à l'ouverture de la page, la
                barre du haut est plus bas que 0 (le bandeau « démo » est au-dessus), donc une alerte
                fixée en pixels passait dessous. Réservée à ceux qui ont la page Commandes (lot 7). */}
            {canAccess(user.role, "/admin/commandes") ? <NewOrderAlert /> : null}
            {/* useSearchParams exige un Suspense : les onglets se lisent côté navigateur. */}
            <Suspense>
              <AdminSubNav />
            </Suspense>
            {/* Une page qui n'est pas pour ce rôle renvoie sur sa première page (lot 7). */}
            <AdminGuard>{children}</AdminGuard>
          </main>
          <AdminBottomNav />
        </div>
      </div>
    </AdminRoleProvider>
  );
}
