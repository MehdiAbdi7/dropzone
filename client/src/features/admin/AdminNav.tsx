"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, DotsIcon } from "@/components/ui/icons";
import PendingBadge from "./alerts/PendingBadge";
import { usePendingDeliveries } from "./alerts/usePendingDeliveries";
import { BOTTOM_MORE, BOTTOM_PRIMARY, NAV_SECTIONS, sectionFor } from "./navConfig";

// La section de la page affichée : la barre latérale et la barre du bas l'allument.
function useActiveKey() {
  return sectionFor(usePathname())?.key;
}

// La barre latérale, sur ordinateur (lg et plus) : le travail de tous les jours. Leurs sous-onglets sont
// en haut de la page (AdminSubNav). Le logo, « Voir la boutique », la Caisse, la Personnalisation, les
// Réglages, le thème et la déconnexion sont dans la barre du haut (AdminTopbar).
export default function AdminNav() {
  const activeKey = useActiveKey();
  // Les livraisons à confirmer : la pastille rouge de « Commandes », comme sur Niwa Food.
  const { count: pending } = usePendingDeliveries();

  return (
    <nav aria-label="Back-office" className="hidden px-2 py-3 lg:block">
      <ul className="flex flex-col gap-1">
        {NAV_SECTIONS.map(({ key, href, label, icon: SectionIcon }) => (
          <li key={key}>
            <Link
              href={href}
              aria-current={activeKey === key ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                activeKey === key ? "bg-blue text-on-brand" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <SectionIcon size={18} />
              {label}
              {key === "commandes" ? <PendingBadge count={pending} className="ml-auto" /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// La barre du bas, sur téléphone et tablette (sous lg), comme une application : Accueil, Ventes,
// Commandes au milieu (le bouton le plus utilisé, en relief), Catalogue, puis « Plus » avec ce qui
// reste (Historique, Clients). La Caisse, la Personnalisation, les Réglages et « Voir la boutique » sont
// dans le menu ☰ de la barre du haut : jamais deux fois au même endroit.
export function AdminBottomNav() {
  const activeKey = useActiveKey();
  const { count: pending } = usePendingDeliveries();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = BOTTOM_MORE.some((section) => section.key === activeKey);

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
          {BOTTOM_MORE.map(({ key, href, label, short, icon: SectionIcon }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setMoreOpen(false)}
              aria-current={activeKey === key ? "page" : undefined}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-semibold ${
                activeKey === key ? "bg-blue text-on-brand" : "bg-surface-2 text-ink"
              }`}
            >
              <SectionIcon size={22} />
              {short ?? label}
            </Link>
          ))}
        </div>
      </div>

      {/* La barre elle-même, toujours visible en bas de l'écran. */}
      <nav
        aria-label="Back-office"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {BOTTOM_PRIMARY.map(({ key, href, label, short, icon: SectionIcon }) =>
          key === "commandes" ? (
            // Le bouton du milieu, bien démarqué : un rond en relief au-dessus de la barre.
            <Link
              key={key}
              href={href}
              aria-current={activeKey === key ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] font-bold"
            >
              <span
                className={`relative -mt-5 grid h-14 w-14 place-items-center rounded-full border-4 border-surface bg-blue text-on-brand shadow-lg ${
                  activeKey === key ? "ring-2 ring-blue-ink" : ""
                }`}
              >
                <SectionIcon size={26} />
                {/* La pastille rouge : des livraisons attendent d'être confirmées par téléphone. */}
                <PendingBadge count={pending} className="absolute -right-1 -top-1 border-2 border-surface" />
              </span>
              <span className={activeKey === key ? "text-blue-ink" : "text-ink"}>{short ?? label}</span>
            </Link>
          ) : (
            <Link
              key={key}
              href={href}
              aria-current={activeKey === key ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                activeKey === key ? "text-blue-ink" : "text-ink-muted"
              }`}
            >
              <SectionIcon size={22} />
              {short ?? label}
            </Link>
          ),
        )}
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
