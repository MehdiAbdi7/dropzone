import { useEffect, useState } from "react";

// « Maintenant », relu chaque minute : les créneaux du jour disparaissent au fil des heures.
// Gardé dans un état (et pas relu à chaque rendu) pour que le rendu reste prévisible.
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
