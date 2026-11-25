import { describe, expect, it } from "vitest";
import { PAGE_SCROLL_QUIET_MS, canDrift } from "./driftRules";

// Quand le carrousel a le droit d'avancer seul (25/11). Sur iPhone, écrire `scrollLeft` à chaque image pendant que
// le doigt fait défiler la page (ou pendant qu'il est posé) gênait le défilement vertical et faisait clignoter les
// cartes : la dérive attend que tout soit calme.
const calm = { paused: false, visible: true, reducedMotion: false, touching: false, msSincePageScroll: 10_000 };

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
});
