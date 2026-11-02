"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/modeles", label: "Modèles et listes" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/", label: "Voir la boutique" },
];

export default function AdminNav() {
  const pathname = usePathname();
  // /admin/produits/12 garde « Produits » actif ; /admin seul n'active que le tableau de bord.
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : href !== "/" && pathname.startsWith(href));

  return (
    <nav aria-label="Back-office" className="overflow-x-auto px-2 pb-2 lg:overflow-visible">
      <ul className="flex gap-1 lg:flex-col">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold ${
                isActive(link.href) ? "bg-blue text-on-brand" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
