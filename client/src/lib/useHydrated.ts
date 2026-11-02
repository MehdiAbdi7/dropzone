import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false pendant le rendu serveur ET pendant l'hydratation, true ensuite.
// Le panier vient de localStorage, que le serveur ne connaît pas : un composant
// qui l'affiche doit rendre la même chose que le serveur tant qu'il s'hydrate.
// (Le store peut déjà avoir relu le panier : avec le streaming, le layout
// s'hydrate avant la page.)
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
