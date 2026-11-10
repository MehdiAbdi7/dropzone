"use client";

import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { swipeHint } from "./series";

// Les modèles d'une affiche, qu'on fait glisser de gauche à droite sur téléphone (et sur
// ordinateur à partir de 5 modèles). Pour qu'on ne rate pas qu'il y en a d'autres, six
// indices : les noms en haut, les voisins qui dépassent, la flèche ronde, le texte « Glisse
// pour voir… », une petite poussée à l'arrivée et le compteur.
// Le modèle affiché est toujours au centre, du premier au dernier (06/11) : les marges de
// chaque côté sont calculées en CSS (.poster-track dans styles/series-posters.css), sans JavaScript.
// Avec 4 modèles ou moins, l'ordinateur les montre en colonnes et cache les contrôles.
export default function PosterSlider({
  names,
  unavailable,
  layout,
  children,
}: {
  names: string[];
  unavailable?: boolean[];
  layout: "columns" | "slider";
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const items = Children.toArray(children);
  const count = items.length;
  const many = count > 1;
  // Les contrôles disparaissent sur ordinateur quand les colonnes tiennent toutes.
  const desktop = layout === "columns" ? "md:hidden" : "";

  // L'index affiché suit le défilement : la position divisée par la largeur d'un pas.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !many) {
      return;
    }
    const onScroll = () => {
      const [first, second] = track.children as HTMLCollectionOf<HTMLElement>;
      const step = second ? second.offsetLeft - first.offsetLeft : track.clientWidth;
      setIndex(Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / step))));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [count, many]);

  // À l'arrivée, la piste glisse un peu vers la gauche puis revient, deux fois : seulement
  // si on glisse vraiment à cette largeur, et jamais avec « réduire les animations ».
  // La classe est posée sur le DOM, sans état React : rien à rendre de nouveau.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !many) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const asColumns = layout === "columns" && window.matchMedia("(min-width: 768px)").matches;
    if (!reduced && !asColumns) {
      track.classList.add("poster-nudge");
    }
  }, [layout, many]);

  function goTo(target: number) {
    const track = trackRef.current;
    const item = track?.children[target] as HTMLElement | undefined;
    const first = track?.children[0] as HTMLElement | undefined;
    if (!track || !item || !first) {
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: item.offsetLeft - first.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  }

  const hint = swipeHint(names, index);

  return (
    <div className="space-y-4">
      {many ? (
        <div role="group" aria-label="Modèles de la série" className={`flex flex-wrap justify-center gap-2 px-4 ${desktop}`}>
          {names.map((name, i) => (
            <button
              key={name}
              type="button"
              aria-current={i === index ? "true" : undefined}
              aria-label={unavailable?.[i] ? `${name}, indisponible` : name}
              data-unavailable={unavailable?.[i] ? "true" : undefined}
              onClick={() => goTo(i)}
              className="poster-chip"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="poster-frame relative">
        <ul
          ref={trackRef}
          className={`poster-track ${layout === "columns" ? "poster-track-fit" : ""}`}
          style={{ "--cols": count } as CSSProperties}
          onAnimationEnd={(event) => event.currentTarget.classList.remove("poster-nudge")}
        >
          {items.map((item, i) => (
            <li key={names[i]} data-active={i === index ? "true" : undefined} className={many ? "poster-slide" : "poster-single"}>
              {item}
            </li>
          ))}
          {many ? <li aria-hidden="true" className="poster-spacer" /> : null}
        </ul>

        {many && index > 0 ? (
          <button
            type="button"
            aria-label={`Modèle précédent : ${names[index - 1]}`}
            onClick={() => goTo(index - 1)}
            className={`poster-arrow left-2 ${desktop}`}
          >
            <span aria-hidden="true">‹</span>
          </button>
        ) : null}
        {many && index < count - 1 ? (
          <button
            type="button"
            aria-label={`Modèle suivant : ${names[index + 1]}`}
            onClick={() => goTo(index + 1)}
            className={`poster-arrow right-2 ${desktop}`}
          >
            <span aria-hidden="true">›</span>
          </button>
        ) : null}
      </div>

      {many ? (
        <div className={`space-y-2 text-center ${desktop}`}>
          <div aria-hidden="true" className="flex items-center justify-center gap-1.5">
            {names.map((name, i) => (
              <span key={name} className={`poster-dash ${i === index ? "poster-dash-on" : ""}`} />
            ))}
            <span className="ml-1.5 text-xs text-white/70">
              {index + 1} / {count}
            </span>
          </div>
          <p aria-live="polite" className="text-sm font-semibold text-white">
            {hint?.back ? <span aria-hidden="true" className="poster-hint-arrow poster-hint-back">← </span> : null}
            {hint?.text}
            {hint && !hint.back ? <span aria-hidden="true" className="poster-hint-arrow"> →</span> : null}
          </p>
        </div>
      ) : null}
    </div>
  );
}
