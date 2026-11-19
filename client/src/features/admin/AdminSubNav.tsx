"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import PendingBadge from "./alerts/PendingBadge";
import { usePendingDeliveries, useReservedPickups } from "./alerts/usePendingDeliveries";
import { useAdminRole } from "./AdminRoleContext";
import { activeTab, sectionFor, visibleTabs } from "./navConfig";

// Les sous-onglets de la section affichée (Commandes : Livraisons, Retraits, Magasin…), en haut de
// la page. Une section sans onglets (Historique, Clients) n'en montre pas. Le détail d'une commande
// n'allume aucun onglet mais garde la rangée pour revenir à la liste.
export default function AdminSubNav() {
  const path = usePathname();
  const params = useSearchParams();
  const { count: pending } = usePendingDeliveries();
  const reservations = useReservedPickups().todo.length;
  const role = useAdminRole();
  const section = sectionFor(path);
  if (!section?.tabs) return null;
  const current = activeTab(section, path, params);
  const tabs = visibleTabs(section, role);
  // Un seul onglet permis (le vendeur dans l'Atelier) : une rangée d'un bouton ne sert à rien.
  if (tabs.length < 2) return null;

  return (
    <nav aria-label={section.label} className="mb-6 flex flex-wrap items-center gap-2 border-b border-line pb-3">
      <span className="mr-2 font-display text-sm font-bold text-ink-muted">{section.label}</span>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={current?.href === tab.href ? "page" : undefined}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            current?.href === tab.href ? "bg-blue text-on-brand" : "bg-surface-2 text-ink hover:text-blue-ink"
          }`}
        >
          {tab.label}
          {tab.href === "/admin/livraisons" ? <PendingBadge count={pending} /> : null}
          {tab.href === "/admin/commandes?type=pickup" ? <PendingBadge count={reservations} /> : null}
        </Link>
      ))}
    </nav>
  );
}
