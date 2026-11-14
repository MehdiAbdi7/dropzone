"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CashIcon, ClipboardCheckIcon, CloseIcon, LogoutIcon, MenuIcon, StoreIcon } from "@/components/ui/icons";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useCashTodayQuery } from "@/features/admin/api/cashApi";
import { useLogoutMutation } from "@/features/auth/authApi";
import { MENU_SECTIONS, SETTINGS_HREF, sectionFor } from "./navConfig";

// La barre du haut du back-office (14/11), comme sur Niwa Food : le logo, « Voir la boutique », et un
// menu ☰ avec ce qui n'est pas une page de travail : le thème, l'état de la caisse (avec un lien pour
// l'ouvrir ou la fermer), les réglages et la déconnexion.
export default function AdminTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [logout] = useLogoutMutation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4">
      <div className="flex items-baseline gap-3">
        <Logo href="/admin" size="text-xl" />
        <span className="hidden text-xs text-ink-muted sm:inline">Back-office</span>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/" className="btn btn-secondary">
          <StoreIcon size={18} />
          <span className="hidden sm:inline">Voir la boutique</span>
          <span className="sm:hidden">Boutique</span>
        </Link>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            className="icon-btn"
            aria-label="Menu"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
          {open ? (
            <div
              role="menu"
              aria-label="Menu du back-office"
              className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-1 rounded-xl border border-line bg-surface p-2 shadow-lg"
            >
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
              {MENU_SECTIONS.filter((section) => section.key !== "caisse").map(({ key, href, label, icon: SectionIcon }) => (
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
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold">
                Thème
                <ThemeToggle />
              </div>
              <Link
                role="menuitem"
                href={SETTINGS_HREF}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface-2"
              >
                <ClipboardCheckIcon size={18} />
                Réglages (horaires)
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
