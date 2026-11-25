"use client";

import { useCallback, useEffect, useRef } from "react";
import { canDrift, isUserScroll } from "./driftRules";

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
  // Un doigt est posé sur l'écran (n'importe où), et le dernier mouvement du carrousel qui ne vient pas de lui : le
  // doigt, la molette, l'élan d'un grand coup, une flèche (voir driftRules). `lastWrittenLeft` : la dernière position
  // que NOUS avons écrite, pour ne pas prendre nos propres écritures pour des gestes.
  const isTouching = useRef(false);
  const lastCarouselScroll = useRef(-Infinity);
  const lastWrittenLeft = useRef(0);

  // Le reste fractionnaire de la dérive. `scrollLeft` arrondit sur certains navigateurs : sans
  // accumulateur, une avance de 0,4 px par image serait arrondie à 0 et rien ne bougerait.
  const remainder = useRef(0);

  // Écrit `scrollLeft` en forçant un déplacement instantané (voir la deuxième contrainte).
  const setScrollLeft = useCallback((el: HTMLDivElement, left: number) => {
    const previous = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = left;
    el.style.scrollBehavior = previous;
    // Lue après l'écriture : le navigateur arrondit, c'est la position réellement obtenue qui compte.
    lastWrittenLeft.current = el.scrollLeft;
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

    // Ce que fait la page pendant que le carrousel dérive (25/11) : un doigt posé n'importe où, ou la page qui défile
    // encore par élan. Écouté sur `window`, en passif (aucun risque pour le défilement) ; le doigt est dans une ref
    // (lue aussi par le recentrage), le défilement de la page reste local à cet effet.
    let lastPageScroll = -Infinity;
    const onTouchStart = () => {
      isTouching.current = true;
    };
    const onTouchEnd = () => {
      isTouching.current = false;
    };
    const onPageScroll = () => {
      lastPageScroll = performance.now();
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onPageScroll, { passive: true });

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

      const allowed = canDrift({
        paused: isPaused.current,
        visible: isVisible.current,
        reducedMotion: motionQuery.matches,
        touching: isTouching.current,
        msSincePageScroll: time - lastPageScroll,
        msSinceCarouselScroll: time - lastCarouselScroll.current,
      });
      if (!allowed) return;
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
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("scroll", onPageScroll);
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
    const el = scrollerRef.current;
    // Un mouvement qui ne vient pas de nos écritures est un geste (ou son élan) : la dérive se tait jusqu'à 1,2 s
    // après lui, au lieu de repartir par-dessus l'élan (25/11).
    if (el && isUserScroll(el.scrollLeft, lastWrittenLeft.current)) {
      lastCarouselScroll.current = performance.now();
    }
    if (settleTimer.current) clearTimeout(settleTimer.current);
    const settle = () => {
      // Un doigt encore posé (immobile : aucun événement de défilement) : pas de saut sous lui, on rattend.
      if (isTouching.current) {
        settleTimer.current = setTimeout(settle, SETTLE_DELAY_MS);
        return;
      }
      normalize();
    };
    settleTimer.current = setTimeout(settle, SETTLE_DELAY_MS);
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
