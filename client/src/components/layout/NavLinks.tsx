import Link from "next/link";
import HashLink from "./HashLink";
import { NAV_LINKS, type NavKey } from "./navigation";

// La liste des liens, sans hook : le serveur l'affiche telle quelle (sans lien actif)
// pendant que HeaderNav et MobileMenu, côté client, lisent l'adresse de la page.
export default function NavLinks({
  active = null,
  layout = "bar",
}: {
  active?: NavKey | null;
  layout?: "bar" | "menu";
}) {
  return (
    <ul className={layout === "bar" ? "flex items-center gap-1" : "grid gap-1"}>
      {NAV_LINKS.map((link) => {
        const current = link.key === active;
        // Un lien vers une section de page (« /#categories ») défile même au deuxième clic.
        const LinkTag = link.href.includes("#") ? HashLink : Link;
        return (
          <li key={link.key}>
            <LinkTag
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={
                layout === "bar"
                  ? `relative block px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:text-ink ${
                      current
                        ? "text-ink after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-red"
                        : "text-ink-muted"
                    }`
                  : `block rounded-[10px] px-3 py-3 text-base font-semibold ${
                      current ? "bg-surface-2 text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    }`
              }
            >
              {link.label}
            </LinkTag>
          </li>
        );
      })}
    </ul>
  );
}
