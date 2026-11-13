"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  CashIcon,
  ClipboardCheckIcon,
  CloseIcon,
  DotsIcon,
  GridIcon,
  HomeIcon,
  ListIcon,
  LogoutIcon,
  PackageIcon,
  PhoneIcon,
  StoreIcon,
  UsersIcon,
} from "@/components/ui/icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useLogoutMutation } from "@/features/auth/authApi";

type NavLink = {
  href: string;
  label: string;
  // Le libellé court de la barre du bas (sinon le libellé normal).
  short?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  // Dans la barre du bas ; les autres liens sont dans le panneau « Plus ».
  primary?: boolean;
};

const LINKS: NavLink[] = [
  { href: "/admin", label: "Tableau de bord", short: "Accueil", icon: HomeIcon, primary: true },
  { href: "/admin/commandes", label: "Commandes", icon: PackageIcon, primary: true },
  // Le catalogue suit les étapes de la Boutique : catégorie, marque, série, modèle.
  { href: "/admin/catalogue", label: "Catalogue", icon: GridIcon, primary: true },
  // La caisse du jour (14/11), utilisée au comptoir : dans la barre du bas, à la place de Produits.
  { href: "/admin/caisse", label: "Caisse", icon: CashIcon, primary: true },
  { href: "/admin/produits", label: "Produits", icon: PhoneIcon },
  { href: "/admin/listes", label: "Listes", icon: ListIcon },
  // La personnalisation de la boutique : pour l'instant, les photos du socle de l'accueil (06/11).
  { href: "/admin/accueil", label: "Personnalisation", icon: StoreIcon },
  { href: "/admin/clients", label: "Clients", icon: UsersIcon },
  // Les réglages du magasin (14/11) : les horaires des retraits.
  { href: "/admin/reglages", label: "Réglages", icon: ClipboardCheckIcon },
  { href: "/", label: "Voir la boutique", short: "Boutique", icon: StoreIcon },
];

// /admin/produits/12 garde « Produits » actif ; /admin seul n'active que le tableau de bord.
function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/admin" ? pathname === "/admin" : href !== "/" && pathname.startsWith(href));
}

// La barre latérale, sur ordinateur (lg et plus).
export default function AdminNav() {
  const isActive = useIsActive();

  return (
    <nav aria-label="Back-office" className="hidden px-2 pb-2 lg:block">
      <ul className="flex flex-col gap-1">
        {LINKS.map(({ href, label, icon: LinkIcon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                isActive(href) ? "bg-blue text-on-brand" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <LinkIcon size={18} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// La barre du bas, sur téléphone et tablette (sous lg), comme une application : les 4
// pages de tous les jours sous le pouce, le reste dans le panneau « Plus » qui monte du bas
// (même principe que le back-office de Niwa Food, demande de Mehdi du 05/11).
export function AdminBottomNav() {
  const isActive = useIsActive();
  const router = useRouter();
  const [logout] = useLogoutMutation();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = LINKS.filter((link) => link.primary);
  const secondary = LINKS.filter((link) => !link.primary);
  const moreActive = secondary.some((link) => isActive(link.href));

  async function onLogout() {
    await logout();
    router.push("/connexion");
    router.refresh();
  }

  return (
    <>
      {/* Le fond du panneau : un toucher dessus le ferme. */}
      <div
        aria-hidden="true"
        onClick={() => setMoreOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 lg:hidden ${
          moreOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plus"
        inert={!moreOpen}
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out lg:hidden ${
          moreOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-sm font-bold">Plus</p>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => setMoreOpen(false)}>
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {secondary.map(({ href, label, short, icon: LinkIcon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-semibold ${
                isActive(href) ? "bg-blue text-on-brand" : "bg-surface-2 text-ink"
              }`}
            >
              <LinkIcon size={22} />
              {short ?? label}
            </Link>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface-2 px-2 py-3 text-xs font-semibold text-red"
          >
            <LogoutIcon size={22} />
            Déconnexion
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-surface-2 px-3 py-2 text-xs font-semibold">
          Thème
          <ThemeToggle />
        </div>
      </div>

      {/* La barre elle-même, toujours visible en bas de l'écran. */}
      <nav
        aria-label="Back-office"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {primary.map(({ href, label, short, icon: LinkIcon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
              isActive(href) ? "text-blue-ink" : "text-ink-muted"
            }`}
          >
            <LinkIcon size={22} />
            {short ?? label}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
            moreActive ? "text-blue-ink" : "text-ink-muted"
          }`}
        >
          <DotsIcon size={22} />
          Plus
        </button>
      </nav>
    </>
  );
}
