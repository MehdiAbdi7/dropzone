"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { COST_IDLE_MS, MASKED_COST, costsVisible, idleExpired } from "./costVisibility";
import CostPinDialog from "./CostPinDialog";
import { useCostPinStatusQuery, useVerifyCostPinMutation } from "./costPinApi";

// Le verrou des prix d'achat du back-office (27/11, demande de Mehdi). Un client qui regarde l'écran du vendeur ne doit pas
// voir un prix d'achat : l'admin règle un code à 4 chiffres (Réglages), tout ce qui révèle un prix d'achat est caché par
// défaut, et le code les montre. Ils se recachent d'un bouton, au rechargement de la page, ou après cinq minutes sans
// toucher à l'écran. L'état « déverrouillé » ne vit qu'en mémoire (jamais dans le navigateur) : fermer l'onglet recache.
// C'est un choix d'affichage : l'API garde ses règles par rôle (le vendeur ne reçoit déjà ni marge ni bénéfice).
type CostGuard = {
  // Les prix d'achat se voient-ils ?
  visible: boolean;
  // L'état du code est-il connu, et un code est-il réglé ? (Le bouton de la barre du haut n'existe que si oui.)
  loaded: boolean;
  configured: boolean;
  // Ouvre la fenêtre du code.
  askPin: () => void;
  // Recache les prix d'achat.
  lock: () => void;
};

// Sans fournisseur (une page hors du back-office), tout reste caché : en cas d'oubli, on cache plutôt qu'on montre.
const CostGuardContext = createContext<CostGuard>({ visible: false, loaded: false, configured: true, askPin: () => {}, lock: () => {} });

export function CostGuardProvider({ children }: { children: ReactNode }) {
  const status = useCostPinStatusQuery();
  const [verify] = useVerifyCostPinMutation();
  const [unlocked, setUnlocked] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const lastActivity = useRef(0);

  const loaded = status.isSuccess;
  const configured = status.data?.configured ?? false;
  const visible = costsVisible({ loaded, configured, unlocked });

  // Déverrouillé : chaque geste (toucher, clavier, défilement) repousse l'échéance ; sans geste pendant cinq minutes, les
  // prix se recachent. Un minuteur vérifie toutes les dix secondes.
  useEffect(() => {
    if (!unlocked) return;
    const touch = () => {
      lastActivity.current = Date.now();
    };
    touch();
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const name of events) window.addEventListener(name, touch, { passive: true, capture: true });
    const timer = window.setInterval(() => {
      if (idleExpired(lastActivity.current, Date.now(), COST_IDLE_MS)) setUnlocked(false);
    }, 10_000);
    return () => {
      for (const name of events) window.removeEventListener(name, touch, { capture: true });
      window.clearInterval(timer);
    };
  }, [unlocked]);

  const lock = useCallback(() => setUnlocked(false), []);
  const askPin = useCallback(() => setDialogOpen(true), []);

  // Le code est vérifié par l'API (jamais comparé dans le navigateur). Une erreur remonte au dialogue, qui l'affiche.
  const submit = useCallback(
    async (pin: string) => {
      await verify(pin).unwrap();
      setUnlocked(true);
      setDialogOpen(false);
    },
    [verify],
  );

  const value = useMemo<CostGuard>(() => ({ visible, loaded, configured, askPin, lock }), [visible, loaded, configured, askPin, lock]);

  return (
    <CostGuardContext.Provider value={value}>
      {children}
      <CostPinDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={submit} />
    </CostGuardContext.Provider>
  );
}

export const useCosts = () => useContext(CostGuardContext);

// Le champ où l'on tape un prix d'achat : un champ numérique quand les prix sont visibles, sinon un bouton de la même taille
// (des points) qui ouvre la fenêtre du code. La valeur du formulaire n'est pas touchée : cacher ne l'efface pas.
export function CostInput({
  id,
  value,
  onChange,
  className = "input",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { visible, askPin } = useCosts();
  if (visible) {
    return <input id={id} className={className} inputMode="numeric" value={value} onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))} />;
  }
  return (
    <button type="button" id={id} className={`${className} cursor-pointer text-left text-ink-muted`} onClick={askPin}>
      <span className="font-mono tracking-widest">{MASKED_COST}</span> · saisir le code
    </button>
  );
}

// Un prix d'achat (ou une marge, un bénéfice) : visible, ou remplacé par des points sur lesquels on touche pour saisir le
// code. `label` dit ce qui est caché, pour un lecteur d'écran.
export function Cost({ children, label = "Prix d'achat" }: { children: ReactNode; label?: string }) {
  const { visible, askPin } = useCosts();
  if (visible) {
    return <>{children}</>;
  }
  return (
    <button
      type="button"
      onClick={askPin}
      aria-label={`${label} masqué : toucher pour saisir le code`}
      title="Prix masqué : toucher pour saisir le code"
      className="cursor-pointer rounded bg-surface-2 px-1.5 font-mono text-xs tracking-widest text-ink-muted hover:bg-line"
    >
      {MASKED_COST}
    </button>
  );
}
