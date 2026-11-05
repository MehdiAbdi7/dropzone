import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AdminNav, { AdminBottomNav } from "@/features/admin/AdminNav";
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
    <div className="flex flex-1 flex-col lg:flex-row">
      {/* Sur ordinateur, la barre latérale reste en place pendant le défilement (05/11) :
          sticky sur toute la hauteur de l'écran, avec son propre défilement si besoin.
          Sur téléphone et tablette, comme une application : une barre fine collée en haut
          (le logo) et la navigation dans la barre du bas (AdminBottomNav). */}
      <aside className="sticky top-0 z-20 border-b border-line bg-surface lg:h-dvh lg:w-60 lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:space-y-1 lg:p-4">
          <Logo href="/admin" size="text-xl" />
          <p className="text-xs text-ink-muted lg:mt-1">Back-office</p>
        </div>
        <AdminNav />
        <div className="hidden p-4 lg:block">
          <ThemeToggle />
        </div>
      </aside>
      {/* pb-24 sous lg : la barre du bas ne cache pas la fin de la page. */}
      <main id="contenu" className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 hero-glow">
        {children}
      </main>
      <AdminBottomNav />
    </div>
  );
}
