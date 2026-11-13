import { useEffect, useState } from "react";

// Une valeur qui ne suit la saisie qu'après une courte pause : une recherche ne lance pas une
// requête à chaque touche tapée, seulement quand on s'arrête d'écrire.
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
