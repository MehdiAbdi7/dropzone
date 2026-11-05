import Link from "next/link";
import { Suspense } from "react";
import CartLink from "@/features/cart/CartLink";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { MenuIcon, UserIcon } from "@/components/ui/icons";
import HeaderNav from "./HeaderNav";
import MobileMenu from "./MobileMenu";
import NavLinks from "./NavLinks";
import SearchToggle from "./SearchToggle";

// L'en-tête, sombre dans les deux thèmes (bloc de marque). Un Server Component :
// seuls la navigation (qui lit l'adresse), la recherche, le panier, le thème et
// le menu mobile sont des composants client.
export default function Header() {
  return (
    // sticky : l'en-tête reste visible en haut pendant le défilement (demande de Mehdi du
    // 05/11). Il reste positionné, donc le panneau de recherche se place toujours dessous.
    <header className="brand-dark sticky top-0 z-30 border-b border-line">
      <div className="container-page flex min-h-16 items-center gap-2 py-2 lg:gap-6">
        <Logo />

        <nav aria-label="Navigation principale" className="mx-auto hidden lg:block">
          {/* Le serveur affiche les liens sans lien actif ; le client le souligne. */}
          <Suspense fallback={<NavLinks />}>
            <HeaderNav />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <SearchToggle />
          <Link href="/compte" className="icon-btn hidden sm:inline-grid" aria-label="Mon compte">
            <UserIcon />
          </Link>
          <CartLink />
          <span className="hidden lg:contents">
            <ThemeToggle />
          </span>
          <Link href="/produits?condition=affaire" className="btn btn-primary btn-small ml-2 hidden lg:inline-flex">
            Voir les affaires
          </Link>
          {/* Même place et même taille avant que le client ne prenne la main : rien ne bouge. */}
          <Suspense
            fallback={
              <span className="icon-btn lg:hidden" aria-hidden="true">
                <MenuIcon />
              </span>
            }
          >
            <MobileMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
