import { describe, expect, it } from "vitest";
import { copyAccess, COPIES } from "./copies";

describe("copyAccess", () => {
  it("rend trois copies, celle du milieu étant la vraie liste", () => {
    expect(COPIES).toEqual([0, 1, 2]);
    expect(copyAccess(1)).toEqual({ hidden: false, tabIndex: undefined });
  });

  // Le bug du 13/11 : les copies latérales étaient `inert`, ce qui coupe aussi les clics. Or la
  // boucle les fait passer à l'écran (après chaque saut, tout ce qu'on voit est la copie 0).
  it("laisse les copies latérales cliquables, mais hors du clavier et des lecteurs d'écran", () => {
    for (const copy of [0, 2]) {
      const access = copyAccess(copy);
      expect(access).not.toHaveProperty("inert");
      expect(access).toEqual({ hidden: true, tabIndex: -1 });
    }
  });
});
