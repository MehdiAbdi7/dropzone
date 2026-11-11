import { describe, expect, it } from "vitest";
import { startsHidden } from "./revealRules";

// Une section qui apparaît au défilement ne doit se cacher que si elle est hors de l'écran au
// chargement : celles qu'on voit déjà (le hero) ne doivent jamais clignoter.
describe("startsHidden", () => {
  const viewport = 800;

  it("laisse visible une section déjà à l'écran", () => {
    expect(startsHidden(0, viewport)).toBe(false);
    expect(startsHidden(300, viewport)).toBe(false);
  });

  it("laisse visible une section déjà passée, au-dessus de l'écran (retour de page, ancre)", () => {
    expect(startsHidden(-1200, viewport)).toBe(false);
  });

  it("laisse visible une section dont le haut est tout juste dans l'écran", () => {
    expect(startsHidden(viewport * 0.9 - 1, viewport)).toBe(false);
  });

  it("cache une section sous le bas de l'écran", () => {
    expect(startsHidden(viewport * 0.9, viewport)).toBe(true);
    expect(startsHidden(2000, viewport)).toBe(true);
  });
});
