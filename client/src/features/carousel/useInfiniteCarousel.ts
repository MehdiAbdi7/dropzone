"use client";

import { useCallback, useEffect, useRef } from "react";

// Repris du carrousel de Niwa Food (11/11), sans les flèches : sur DropZone, il défile seul et
// se saisit au doigt ou à la molette.

const SETTLE_DELAY_MS = 140;
const AUTOPLAY_SPEED_PX_S = 38;
const RESUME_DELAY_MS = 2500;

// Défilement horizontal en boucle, avec dérive automatique.
//
// La liste est rendue trois fois par l'appelant ; le hook maintient le défilement dans la copie
// centrale. Aucun index n'est stocké : le navigateur reste seul maître de `scrollLeft`, on ne fait
// que le recentrer et l'avancer.
//
// DEUX CONTRAINTES sur le conteneur, sous peine d'immobilité :
//  - pas de scroll-snap (`snap-mandatory` ramènerait à l'ancre à chaque image) ;
//  - pas de `scroll-behavior: smooth` en CSS : écrire `scrollLeft` le respecte, donc chaque image
//    lancerait une animation fluide qui annulerait la précédente. Safari l'applique strictement :
//    le carrousel resterait figé sur iPhone alors qu'il avance sur Chrome.
export function useInfiniteCarousel(
  itemCount: number,
  autoplaySpeed = AUTOPLAY_SPEED_PX_S,
) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Des refs et non du state : ces valeurs changent à chaque image ou à chaque geste, le state
  // provoquerait un rendu par mouvement de souris.
  const isPaused = useRef(false);
  const isVisible = useRef(false);

  // Le reste fractionnaire de la dérive. `scrollLeft` arrondit sur certains navigateurs : sans
  // accumulateur, une avance de 0,4 px par image serait arrondie à 0 et rien ne bougerait.
  const remainder = useRef(0);

  // Écrit `scrollLeft` en forçant un déplacement instantané (voir la deuxième contrainte).
  const setScrollLeft = useCallback((el: HTMLDivElement, left: number) => {
    const previous = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = left;
    el.style.scrollBehavior = previous;
  }, []);

  const jumpTo = useCallback(
    (left: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      setScrollLeft(el, left);
      remainder.current = 0;
    },
    [setScrollLeft],
  );

  // Ramène le défilement dans la copie centrale s'il s'en est trop éloigné.
  const normalize = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const copyWidth = el.scrollWidth / 3;

    // Pas encore mesurable, ou trop peu de contenu pour déborder : une simple rangée, sans boucle.
    if (copyWidth === 0 || el.scrollWidth <= el.clientWidth) return;

    if (el.scrollLeft < copyWidth * 0.5) {
      jumpTo(el.scrollLeft + copyWidth);
    } else if (el.scrollLeft > copyWidth * 1.5) {
      jumpTo(el.scrollLeft - copyWidth);
    }
  }, [jumpTo]);

  // Le centrage initial : on se place sur le début de la copie du milieu.
  useEffect(() => {
    if (itemCount === 0) return;
    const frame = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) jumpTo(el.scrollWidth / 3);
    });
    return () => cancelAnimationFrame(frame);
  }, [itemCount, jumpTo]);

  // ---------- Pause et reprise ----------

  const resume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    isPaused.current = false;
  }, []);

  // Suspend, puis reprend seul après RESUME_DELAY_MS. Toute pause tactile passe par ici : sur
  // téléphone, un `touchend` peut ne jamais arriver (le doigt quitte l'écran ailleurs, ou le geste
  // devient un défilement vertical de la page). Une pause sans échéance figerait le carrousel.
  const pauseTemporarily = useCallback(() => {
    isPaused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      isPaused.current = false;
    }, RESUME_DELAY_MS);
  }, []);

  // Une pause franche, sans reprise programmée : réservée au survol de la souris.
  const pauseWhileHovering = useCallback(() => {
    isPaused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  // ---------- La dérive ----------

  useEffect(() => {
    if (itemCount === 0) return;
    const el = scrollerRef.current;
    if (!el) return;

    // Écouté en continu et non testé une fois : sur iPhone, « Réduire les animations » peut être
    // basculé pendant que la page est ouverte.
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Pas d'animation hors écran : du calcul perdu, et de la batterie. `isVisible` démarre à
    // true : si l'observateur n'émettait rien, le carrousel tournerait plutôt que de rester bloqué.
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.current = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(el);

    let frameId = 0;
    let lastTime = 0;

    const tick = (time: number) => {
      frameId = requestAnimationFrame(tick);

      // Premier passage, ou retour sur l'onglet après une longue absence : on repart de zéro
      // plutôt que d'appliquer un écart de plusieurs secondes.
      if (!lastTime || time - lastTime > 250) {
        lastTime = time;
        return;
      }

      const deltaSeconds = (time - lastTime) / 1000;
      lastTime = time;

      if (motionQuery.matches) return;
      if (isPaused.current || !isVisible.current) return;
      if (el.scrollWidth <= el.clientWidth) return;

      const advance = autoplaySpeed * deltaSeconds + remainder.current;
      const whole = Math.floor(advance);
      remainder.current = advance - whole;

      if (whole > 0) {
        setScrollLeft(el, el.scrollLeft + whole);
        // Recentré à chaque image : le délai du geste manuel (handleScroll) ne se déclencherait
        // jamais ici, les événements de défilement ne s'arrêtant pas.
        normalize();
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [autoplaySpeed, itemCount, normalize, setScrollLeft]);

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  // ---------- Les gestes ----------

  // Utile seulement quand la dérive est en pause : sinon la boucle ci-dessus a déjà recentré.
  const handleScroll = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(normalize, SETTLE_DELAY_MS);
  }, [normalize]);

  const scrollManually = useCallback(
    (direction: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;

      pauseTemporarily();
      const firstItem = el.firstElementChild;
      const itemWidth =
        firstItem instanceof HTMLElement
          ? firstItem.getBoundingClientRect().width
          : el.clientWidth * 0.75;
      const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 0;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";

      el.scrollTo({
        left: el.scrollLeft + direction * (itemWidth + gap),
        behavior,
      });
    },
    [pauseTemporarily],
  );

  // Filtré sur le type de pointeur : sur téléphone, un toucher émet un `pointerenter` SANS
  // `pointerleave` (le pointeur tactile cesse d'exister au lieu de sortir). Le tactile passe donc
  // uniquement par les pauses à échéance.
  const scrollerHandlers = {
    onPointerEnter: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") pauseWhileHovering();
    },
    onPointerLeave: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") resume();
    },
    onFocus: pauseWhileHovering,
    onBlur: resume,
    onTouchStart: pauseTemporarily,
    onTouchEnd: pauseTemporarily,
    onWheel: pauseTemporarily,
  };

  return { scrollerRef, handleScroll, scrollerHandlers, scrollManually };
}
