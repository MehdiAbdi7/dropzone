"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { startsHidden } from "./revealRules";

// Une section de l'accueil qui apparaît en douceur quand on l'atteint (11/11), comme sur Niwa
// Food : elle reste invisible tant qu'elle est sous l'écran, puis monte et se fond d'un coup, une
// seule fois.
//
// Le HTML du serveur est visible : sans JavaScript, ou avant le chargement, rien n'est caché. Le
// masquage se fait au montage, dans useLayoutEffect, donc avant que le navigateur dessine
// quoi que ce soit : une section sous l'écran n'a de toute façon rien à montrer encore, et celles
// qu'on voit déjà ne sont jamais cachées (startsHidden). L'état passe par un attribut du DOM
// (`data-reveal`, les règles sont dans utilities.css) et non par du state : pas de rendu React
// pour une animation.
//
// « Réduire les animations » : rien n'est caché, la section est là tout de suite.
export default function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (
      !startsHidden(element.getBoundingClientRect().top, window.innerHeight)
    ) {
      return;
    }

    element.dataset.reveal = "hidden";
    // Un peu avant le bas de l'écran (-12 %) : la section démarre quand on commence à la voir
    // vraiment, pas dès son premier pixel.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}
