import Link from "next/link";
import CartLink from "@/features/cart/CartLink";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { publicFetch } from "@/lib/publicFetch";
import type { Category } from "@/types/api";

// Un Server Component : les catégories sont lues côté serveur, en cache 5 minutes.
// Seuls le panier et le bouton de thème sont des composants client.
export default async function Header() {
  const categories = (await publicFetch<Category[]>("/categories", 300)) ?? [];

  return (
    <header className="border-b border-line bg-bg">
      <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
        <Logo />
        {/* Une simple form GET : chercher marche même sans JavaScript. */}
        <form action="/produits" className="order-last w-full md:order-none md:w-auto md:flex-1" role="search">
          <label htmlFor="header-search" className="sr-only">
            Chercher un modèle
          </label>
          <input
            id="header-search"
            name="q"
            type="search"
            className="input"
            placeholder="Chercher un modèle : iPhone 15 Pro Max, Galaxy S24…"
          />
        </form>
        <nav className="ml-auto flex items-center gap-2" aria-label="Compte et panier">
          <Link href="/compte" className="btn btn-secondary btn-small">
            Mon compte
          </Link>
          <ThemeToggle />
          <CartLink />
        </nav>
      </div>
      <nav aria-label="Catégories" className="border-t border-line">
        <ul className="container-page scroll-quiet flex gap-1 overflow-x-auto py-2 text-sm font-semibold">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/produits?category=${category.slug}`}
                className="block whitespace-nowrap rounded-md px-3 py-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                {category.name}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/produits?condition=reconditionne"
              className="block whitespace-nowrap rounded-md px-3 py-2 text-blue-ink hover:bg-surface-2"
            >
              Reconditionnés
            </Link>
          </li>
          <li>
            <Link href="/suivi" className="block whitespace-nowrap rounded-md px-3 py-2 text-ink-muted hover:bg-surface-2 hover:text-ink">
              Suivre une commande
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
