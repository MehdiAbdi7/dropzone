"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { MASKED_COST, isCostVisible, nextExpiry, stillRevealed, withReveal, withoutReveal, type Revealed } from "./costVisibility";
import CostPinDialog from "./CostPinDialog";
import { useCostPinStatusQuery, useVerifyCostPinMutation } from "./costPinApi";

// Le verrou des prix d'achat du back-office (27/11, demande de Mehdi). Un client qui regarde l'écran du vendeur ne doit pas
// voir un prix d'achat : l'admin règle un code à 4 chiffres (Réglages), tout ce qui révèle un prix d'achat est caché par
// défaut, et le code se tape POUR UN PRIX À LA FOIS (les autres restent cachés). Un prix débloqué se recache d'un toucher,
// seul après trente secondes, ou en quittant la page. Les déblocages ne vivent qu'en mémoire (jamais dans le navigateur).
// Deux endroits qui montrent le même prix (la carte d'un appareil et sa ligne de ticket) partagent la même CLÉ : un code
// débloque les deux. C'est un choix d'affichage : l'API garde ses règles par rôle.
type CostGuard = {
  // L'état du code est-il connu, et un code est-il réglé ?
  loaded: boolean;
  configured: boolean;
  // Ce prix se voit-il ?
  isVisible: (key: string) => boolean;
  // Ouvre la fenêtre du code pour débloquer ce prix.
  reveal: (key: string) => void;
  // Recache ce prix tout de suite.
  hide: (key: string) => void;
  // Repousse le délai de ce prix (on est en train de le saisir : il ne doit pas se recacher sous les doigts).
  keepAlive: (key: string) => void;
};

// Sans fournisseur (une page hors du back-office), tout reste caché : en cas d'oubli, on cache plutôt qu'on montre.
const CostGuardContext = createContext<CostGuard>({
  loaded: false,
  configured: true,
  isVisible: () => false,
  reveal: () => {},
  hide: () => {},
  keepAlive: () => {},
});

export function CostGuardProvider({ children }: { children: ReactNode }) {
  const status = useCostPinStatusQuery();
  const [verify] = useVerifyCostPinMutation();
  const [revealed, setRevealed] = useState<Revealed>({});
  // Le prix dont on tape le code : la fenêtre est ouverte tant qu'il y en a un.
  const [asking, setAsking] = useState<string | null>(null);
  // Un compteur qui force le nouvel affichage quand un délai s'écoule (la liste des déblocages, elle, ne change pas seule).
  const [, setTick] = useState(0);

  const loaded = status.isSuccess;
  const configured = status.data?.configured ?? false;

  // Au prochain délai écoulé, les prix concernés se recachent : un seul minuteur, réarmé à chaque changement.
  useEffect(() => {
    const next = nextExpiry(revealed);
    if (next === null) return;
    const timer = window.setTimeout(() => {
      setRevealed((current) => stillRevealed(current, Date.now()));
      setTick((value) => value + 1);
    }, Math.max(next - Date.now(), 0) + 20);
    return () => window.clearTimeout(timer);
  }, [revealed]);

  const isVisible = useCallback(
    (key: string) => isCostVisible({ loaded, configured, expiresAt: revealed[key], now: Date.now() }),
    [loaded, configured, revealed],
  );
  const reveal = useCallback((key: string) => setAsking(key), []);
  const hide = useCallback((key: string) => setRevealed((current) => withoutReveal(current, key)), []);
  const keepAlive = useCallback((key: string) => setRevealed((current) => (key in current ? withReveal(current, key, Date.now()) : current)), []);

  // Le code est vérifié par l'API (jamais comparé dans le navigateur). Une erreur remonte au dialogue, qui l'affiche.
  const submit = useCallback(
    async (pin: string) => {
      await verify(pin).unwrap();
      if (asking !== null) {
        const key = asking;
        setRevealed((current) => withReveal(current, key, Date.now()));
      }
      setAsking(null);
    },
    [verify, asking],
  );

  const value = useMemo<CostGuard>(
    () => ({ loaded, configured, isVisible, reveal, hide, keepAlive }),
    [loaded, configured, isVisible, reveal, hide, keepAlive],
  );

  return (
    <CostGuardContext.Provider value={value}>
      {children}
      <CostPinDialog open={asking !== null} onClose={() => setAsking(null)} onSubmit={submit} />
    </CostGuardContext.Provider>
  );
}

export const useCosts = () => useContext(CostGuardContext);

// Le déblocage d'UN prix. Sans clé, le prix a la sienne (un identifiant propre à ce composant) ; avec une clé partagée
// (« hit:SKU »), tous les endroits qui la portent se débloquent ensemble.
export function useCostReveal(key?: string) {
  const own = useId();
  const id = key ?? own;
  const { isVisible, reveal, hide, keepAlive } = useCosts();
  return {
    visible: isVisible(id),
    reveal: () => reveal(id),
    hide: () => hide(id),
    keepAlive: () => keepAlive(id),
  };
}

// Un « bouton » qui peut se trouver DANS un autre bouton (une carte cliquable) : un `<button>` dans un `<button>` est
// interdit en HTML. C'est donc un `<span role="button">`, qui arrête le clic pour ne pas déclencher la carte autour.
function pressable(action: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      action();
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        action();
      }
    },
  };
}

// Un prix d'achat (ou une marge, un bénéfice) : remplacé par des points tant qu'il n'est pas débloqué (un toucher ouvre la
// fenêtre du code), puis montré ; un toucher sur le prix montré le recache. `label` dit ce qui est caché (lecteur d'écran) ;
// `id` est la clé partagée avec les autres endroits qui montrent ce même prix.
export function Cost({ children, label = "Prix d'achat", id }: { children: ReactNode; label?: string; id?: string }) {
  const { visible, reveal, hide } = useCostReveal(id);
  if (visible) {
    return (
      <span {...pressable(hide)} title="Toucher pour recacher" aria-label={`${label} affiché : toucher pour recacher`} className="cursor-pointer">
        {children}
      </span>
    );
  }
  return (
    <span
      {...pressable(reveal)}
      aria-label={`${label} masqué : toucher pour saisir le code`}
      title="Prix masqué : toucher pour saisir le code"
      className="cursor-pointer rounded bg-surface-2 px-1.5 font-mono text-xs tracking-widest text-ink-muted hover:bg-line"
    >
      {MASKED_COST}
    </span>
  );
}

// Le champ où l'on tape un prix d'achat : un champ numérique une fois débloqué, sinon un bouton de la même taille (des points)
// qui ouvre la fenêtre du code. La valeur du formulaire n'est pas touchée : cacher ne l'efface pas. Taper dans le champ
// repousse le délai, pour qu'il ne se recache pas pendant la saisie.
export function CostInput({
  id,
  value,
  onChange,
  className = "input",
  revealKey,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  // La clé partagée avec les autres endroits qui montrent ce prix.
  revealKey?: string;
}) {
  const { visible, reveal, keepAlive } = useCostReveal(revealKey);
  if (visible) {
    return (
      <input
        id={id}
        className={className}
        inputMode="numeric"
        value={value}
        onChange={(event) => {
          keepAlive();
          onChange(event.target.value.replace(/\D/g, ""));
        }}
      />
    );
  }
  return (
    <button type="button" id={id} className={`${className} cursor-pointer text-left text-ink-muted`} onClick={reveal}>
      <span className="font-mono tracking-widest">{MASKED_COST}</span> · saisir le code
    </button>
  );
}
