import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import AdminNav from "@/features/admin/AdminNav";
import { getCurrentUser } from "@/lib/serverFetch";

export const metadata: Metadata = { title: { default: "Back-office", template: "%s · Back-office DropZone" } };

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
      <aside className="border-b border-line bg-surface lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 p-4 lg:block lg:space-y-1">
          <Logo href="/admin" size="text-xl" />
          <p className="text-xs text-ink-muted lg:mt-1">Back-office</p>
        </div>
        <AdminNav />
        <div className="hidden p-4 lg:block">
          <ThemeToggle />
        </div>
      </aside>
      <main id="contenu" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
