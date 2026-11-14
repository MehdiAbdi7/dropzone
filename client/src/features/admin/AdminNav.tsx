"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ClipboardCheckIcon, CloseIcon, DotsIcon, StoreIcon } from "@/components/ui/icons";
import { SECTIONS, SETTINGS_HREF, sectionFor } from "./navConfig";

// La section de la page affichée : la barre latérale et la barre du bas l'allument.
function useActiveKey() {
  return sectionFor(usePathname())?.key;
}

// La barre latérale, sur ordinateur (lg et plus) : les sept sections. Leurs sous-onglets sont en
// haut de la page (AdminSubNav). Le logo, le thème et la déconnexion sont dans la barre du haut.
export default function AdminNav() {
  const activeKey = useActiveKey();

  return (
    <nav aria-label="Back-office" className="hidden px-2 py-3 lg:block">
      <ul className="flex flex-col gap-1">
        {SECTIONS.map(({ key, href, label, icon: SectionIcon }) => (
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
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// La barre du bas, sur téléphone et tablette (sous lg), comme une application : les 4 sections de
// tous les jours sous le pouce, le reste dans le panneau « Plus » qui monte du bas (même principe
// que le back-office de Niwa Food). Le thème et la déconnexion sont dans le menu ☰ de la barre du haut.
export function AdminBottomNav() {
  const activeKey = useActiveKey();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = SECTIONS.filter((section) => section.primary);
  const secondary = SECTIONS.filter((section) => !section.primary);
  const settingsActive = pathname.startsWith(SETTINGS_HREF);
  const moreActive = settingsActive || secondary.some((section) => section.key === activeKey);

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
          {secondary.map(({ key, href, label, short, icon: SectionIcon }) => (
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
          <Link
            href={SETTINGS_HREF}
            onClick={() => setMoreOpen(false)}
            aria-current={settingsActive ? "page" : undefined}
            className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-semibold ${
              settingsActive ? "bg-blue text-on-brand" : "bg-surface-2 text-ink"
            }`}
          >
            <ClipboardCheckIcon size={22} />
            Réglages
          </Link>
          <Link
            href="/"
            onClick={() => setMoreOpen(false)}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface-2 px-2 py-3 text-xs font-semibold text-ink"
          >
            <StoreIcon size={22} />
            Boutique
          </Link>
        </div>
      </div>

      {/* La barre elle-même, toujours visible en bas de l'écran. */}
      <nav
        aria-label="Back-office"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {primary.map(({ key, href, label, short, icon: SectionIcon }) => (
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
        ))}
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
