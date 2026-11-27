"use client";

import { LockIcon, UnlockIcon } from "@/components/ui/icons";
import { useCosts } from "./CostGuard";

// Le bouton de la barre du haut (27/11) : un cadenas fermé quand les prix d'achat sont cachés (il ouvre la fenêtre du code),
// ouvert quand ils sont visibles (il les recache d'un geste). Il n'existe que si l'admin a réglé un code.
export default function CostToggle() {
  const { visible, loaded, configured, askPin, lock } = useCosts();
  if (!loaded || !configured) {
    return null;
  }
  return visible ? (
    <button type="button" className="btn btn-secondary btn-small btn-pill" onClick={lock} title="Recacher les prix d'achat">
      <UnlockIcon size={16} />
      <span className="hidden sm:inline">Recacher les prix</span>
      <span className="sr-only sm:hidden">Recacher les prix d&apos;achat</span>
    </button>
  ) : (
    <button type="button" className="icon-btn" aria-label="Prix d'achat masqués : saisir le code" title="Saisir le code pour voir les prix d'achat" onClick={askPin}>
      <LockIcon size={18} />
    </button>
  );
}
