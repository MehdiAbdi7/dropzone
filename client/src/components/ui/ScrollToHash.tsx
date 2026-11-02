"use client";

import { useEffect } from "react";

// Next.js fait défiler jusqu'à une ancre (« /#categories ») une seule fois, quand il
// affiche la nouvelle page. Si la page met du temps à arriver (première compilation,
// API lente, réseau mobile), la section n'existe pas encore à cet instant : Next.js
// reste en haut et ne réessaie pas. Posé dans la section, ce composant la fait
// défiler à son arrivée, si l'adresse la vise. Il n'affiche rien.
export default function ScrollToHash({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash === `#${id}`) {
      document.getElementById(id)?.scrollIntoView();
    }
  }, [id]);

  return null;
}
