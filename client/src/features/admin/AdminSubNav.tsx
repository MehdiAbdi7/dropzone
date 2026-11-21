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
    // Sur téléphone, une seule rangée qui défile sur le côté (les onglets ne s'empilent plus sur deux lignes) ; dès
    // 768 px, ils passent à la ligne comme avant.
    <nav aria-label={section.label} className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-line pb-3 [scrollbar-width:none] md:flex-wrap md:overflow-visible">
      <span className="mr-2 hidden shrink-0 whitespace-nowrap font-display text-sm font-bold text-ink-muted md:inline">{section.label}</span>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={current?.href === tab.href ? "page" : undefined}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
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
