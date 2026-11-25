import { describe, expect, it } from "vitest";
import { CAROUSEL_SCROLL_QUIET_MS, PAGE_SCROLL_QUIET_MS, canDrift, isUserScroll } from "./driftRules";

// Quand le carrousel a le droit d'avancer seul (25/11). Sur iPhone, écrire `scrollLeft` à chaque image pendant que
// le doigt fait défiler la page, pendant qu'il est posé, ou pendant l'élan d'un grand coup de doigt sur le carrousel,
// gênait le défilement et faisait clignoter les cartes : la dérive attend que tout soit calme.
const calm = {
  paused: false,
  visible: true,
  reducedMotion: false,
  touching: false,
  msSincePageScroll: 10_000,
  msSinceCarouselScroll: 10_000,
};

describe("canDrift", () => {
  it("avance quand tout est calme", () => {
    expect(canDrift(calm)).toBe(true);
  });

  it("n'avance pas pendant une pause (survol, geste, flèche)", () => {
    expect(canDrift({ ...calm, paused: true })).toBe(false);
  });

  it("n'avance pas hors écran", () => {
    expect(canDrift({ ...calm, visible: false })).toBe(false);
  });

  it("n'avance pas si la personne a réduit les animations", () => {
    expect(canDrift({ ...calm, reducedMotion: true })).toBe(false);
  });

  it("n'avance pas tant qu'un doigt est posé sur l'écran, où qu'il soit", () => {
    expect(canDrift({ ...calm, touching: true })).toBe(false);
  });

  it("attend la fin du défilement de la page, élan compris", () => {
    expect(canDrift({ ...calm, msSincePageScroll: PAGE_SCROLL_QUIET_MS - 1 })).toBe(false);
    expect(canDrift({ ...calm, msSincePageScroll: PAGE_SCROLL_QUIET_MS })).toBe(true);
  });

  // La vidéo de Mehdi : un grand coup de doigt sur le carrousel, qui continue par élan plus de 2,5 s, après quoi la
  // dérive repartait par-dessus l'élan.
  it("attend la fin de l'élan du carrousel lui-même", () => {
    expect(canDrift({ ...calm, msSinceCarouselScroll: CAROUSEL_SCROLL_QUIET_MS - 1 })).toBe(false);
    expect(canDrift({ ...calm, msSinceCarouselScroll: CAROUSEL_SCROLL_QUIET_MS })).toBe(true);
  });
});

describe("isUserScroll", () => {
  // Chaque écriture du carrousel déclenche elle-même un événement de défilement : il ne doit pas compter comme un geste.
  it("ne prend pas pour un geste un défilement que le carrousel vient d'écrire", () => {
    expect(isUserScroll(1500, 1500)).toBe(false);
    expect(isUserScroll(1500.4, 1500)).toBe(false);
  });

  it("reconnaît un déplacement venu du doigt, de la molette ou de l'élan", () => {
    expect(isUserScroll(1530, 1500)).toBe(true);
    expect(isUserScroll(1400, 1500)).toBe(true);
  });
});
