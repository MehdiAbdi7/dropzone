import { useEffect, useRef, useState } from "react";

// La largeur d'un élément, en pixels, tenue à jour quand il change (rotation du téléphone, menu qui s'ouvre, fenêtre
// redimensionnée). Sert aux graphiques : un dessin SVG mis à l'échelle réduirait aussi son texte, donc on le dessine
// directement à la largeur réelle (1 unité = 1 pixel) et le texte garde sa vraie taille. `fallback` : la largeur avant
// la première mesure (rendu sur le serveur).
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}
