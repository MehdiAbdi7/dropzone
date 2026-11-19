"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CashIcon, ClipboardCheckIcon, CloseIcon, LogoutIcon, StoreIcon, UsersIcon } from "@/components/ui/icons";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useCashTodayQuery } from "@/features/admin/api/cashApi";
import { useLogoutMutation } from "@/features/auth/authApi";
import { playTestChime } from "@/lib/orderAlertSound";
import { useHydrated } from "@/lib/useHydrated";
import { canAccess, homeFor } from "./access";
import { initialsOf, roleLabel, todayLabel } from "./adminIdentity";
import { useAdminRole } from "./AdminRoleContext";
import { ACCOUNT_HREF, MENU_SECTIONS, SETTINGS_HREF, isVisibleTo, sectionFor } from "./navConfig";

// La barre du haut du back-office (14/11, refaite le 19/11) : translucide, elle porte le titre de la section
// affichée (le logo, sur téléphone, où il n'y a pas de barre latérale), « Voir la boutique », le thème, et
// l'avatar de la personne connectée, qui ouvre le menu : l'état de la caisse (avec un lien pour l'ouvrir ou la
// fermer), les pages hors du travail de tous les jours, les réglages et la déconnexion.
export default function AdminTopbar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useAdminRole();
  const [logout] = useLogoutMutation();
  const [open, setOpen] = useState(false);
  const [soundTest, setSoundTest] = useState<"ok" | "bloqué" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // La date n'existe qu'une fois la page montée dans le navigateur (le serveur n'a pas la même heure).
  const today = useHydrated() ? todayLabel(new Date()) : "";
  // L'état de la caisse ne se lit qu'à l'ouverture du menu : un appel de plus à chaque page, pour une
  // information que personne ne regarde encore, serait du gaspillage.
  const { data: cash } = useCashTodayQuery(undefined, { skip: !open });

  useEffect(() => {
    if (!open) return;
    // mousedown et non click : le menu se ferme AVANT que le clic n'atteigne l'élément visé.
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onLogout() {
    await logout();
    router.push("/connexion");
    router.refresh();
  }

  const day = cash?.day;
  const cashText = !cash ? "…" : !day ? "Pas encore ouverte" : day.closedAt ? "Fermée pour aujourd'hui" : "Ouverte";
  const cashAction = !day ? "Ouvrir la caisse" : day.closedAt ? "Voir la caisse" : "Fermer la caisse";

  return (
    <header className="admin-topbar sticky top-0 z-40 flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
      {/* Sur ordinateur, la barre latérale porte le logo : ici, un bonjour et la date du jour (la page affiche déjà son
          propre titre). La date se pose après l'affichage : le serveur et le navigateur n'ont pas la même heure. */}
      <div className="min-w-0">
        <span className="lg:hidden">
          <Logo href={homeFor(role)} size="text-xl" />
        </span>
        <div className="hidden min-h-10 lg:block">
          <p className="truncate font-display text-lg leading-tight font-extrabold tracking-tight">Bonjour {firstName}</p>
          <p className="truncate text-sm text-ink-muted first-letter:uppercase">{today || " "}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link href="/" className="btn btn-secondary btn-small btn-pill">
          <StoreIcon size={16} />
          <span className="hidden sm:inline">Voir la boutique</span>
          <span className="sm:hidden">Boutique</span>
        </Link>
        <ThemeToggle />
        <div ref={menuRef} className="relative">
          <button
            type="button"
            className="admin-avatar cursor-pointer transition-transform hover:scale-105"
            aria-label={`Menu de ${firstName} ${lastName}`.trim()}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon size={18} /> : initialsOf(firstName, lastName)}
          </button>
          {open ? (
            <div
              role="menu"
              aria-label="Menu du back-office"
              className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-1 rounded-2xl border border-[var(--admin-line)] bg-surface p-2 shadow-xl"
            >
              {/* Qui est connecté : le nom et le rôle. */}
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                <span className="admin-avatar" aria-hidden="true">
                  {initialsOf(firstName, lastName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {firstName} {lastName}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">{roleLabel(role)}</span>
                </span>
              </div>
              {/* La Caisse : l'état du jour et un lien pour l'ouvrir, la fermer ou la voir. */}
              <Link
                role="menuitem"
                href="/admin/caisse"
                aria-current={sectionFor(pathname)?.key === "caisse" ? "page" : undefined}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
              >
                <span className="flex items-center gap-2.5">
                  <CashIcon size={18} />
                  <span>
                    <span className="block font-semibold">Caisse</span>
                    <span className="block text-xs text-ink-muted">{cashText}</span>
                  </span>
                </span>
                <span className="text-xs font-semibold text-blue-ink underline">{cash ? cashAction : ""}</span>
              </Link>
              {MENU_SECTIONS.filter((section) => section.key !== "caisse" && isVisibleTo(role)(section)).map(({ key, href, label, icon: SectionIcon }) => (
                <Link
                  key={key}
                  role="menuitem"
                  href={href}
                  aria-current={sectionFor(pathname)?.key === key ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-2"
                >
                  <SectionIcon size={18} />
                  {label}
                </Link>
              ))}
              {/* Le navigateur n'autorise le son qu'après un geste : ce bouton le débloque et le fait entendre.
                  Les alertes sont celles des commandes : le vendeur n'en reçoit pas. */}
              {canAccess(role, "/admin/commandes") ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => setSoundTest((await playTestChime()) ? "ok" : "bloqué")}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-surface-2"
                >
                  Tester le son des alertes
                  <span className="text-xs font-normal text-ink-muted">
                    {soundTest === "ok" ? "Entendu ?" : soundTest === "bloqué" ? "Son bloqué" : ""}
                  </span>
                </button>
              ) : null}
              <Link
                role="menuitem"
                href={SETTINGS_HREF}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-2"
              >
                <ClipboardCheckIcon size={18} />
                Réglages (horaires, facture)
              </Link>
              <Link
                role="menuitem"
                href={ACCOUNT_HREF}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-2"
              >
                <UsersIcon size={18} />
                Mon compte (email, mot de passe)
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red hover:bg-surface-2"
              >
                <LogoutIcon size={18} />
                Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
