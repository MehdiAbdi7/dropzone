"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, type MouseEvent } from "react";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { CloseIcon, MenuIcon, UserIcon } from "@/components/ui/icons";
import { activeNavKey } from "./navigation";
import NavLinks from "./NavLinks";

// Le menu des petits écrans : un <dialog> modal. Le navigateur gère seul le focus
// (piégé dans le menu, rendu au bouton à la fermeture) et la touche Échap.
export default function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const active = activeNavKey(usePathname(), useSearchParams());

  // Un clic sur le fond (le <dialog> lui-même, hors du panneau) ou sur un lien ferme le menu :
  // l'en-tête ne se recharge pas d'une page à l'autre, le menu resterait sinon ouvert.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) {
      dialogRef.current?.close();
    }
  }

  return (
    <>
      <button
        type="button"
        className="icon-btn lg:hidden"
        aria-label="Menu"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        <MenuIcon />
      </button>
      <dialog ref={dialogRef} className="mobile-menu" aria-label="Menu" onClick={handleClick}>
        <div className="flex h-full flex-col gap-6 p-4">
          <div className="flex items-center justify-between">
            <Logo />
            <button type="button" className="icon-btn" aria-label="Fermer le menu" onClick={() => dialogRef.current?.close()}>
              <CloseIcon />
            </button>
          </div>
          <nav aria-label="Navigation principale">
            <NavLinks active={active} layout="menu" />
          </nav>
          <div className="mt-auto grid gap-2">
            <Link href="/compte" className="btn btn-secondary w-full justify-start">
              <UserIcon />
              Mon compte
            </Link>
            <ThemeToggle withLabel />
            <Link href="/produits?offre=affaire" className="btn btn-primary w-full">
              Voir les affaires
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
