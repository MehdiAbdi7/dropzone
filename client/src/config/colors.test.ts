import { describe, expect, it } from "vitest";
import { paletteFromChoices, swatchOf } from "./colors";

// La palette vient de l'API (GET /colors) : les teintes réglées par le gérant dans Listes.
const palette = { Bordeaux: "#6b1f2e", Orange: "#f47d3c" };

describe("swatchOf", () => {
  it("donne la teinte d'une couleur de la palette, Orange compris", () => {
    expect(swatchOf("Bordeaux", palette)).toBe("#6b1f2e");
    expect(swatchOf("Orange", palette)).toBe("#f47d3c");
  });

  it("ne devine pas la teinte d'une couleur qui n'en a pas", () => {
    expect(swatchOf("Transparent", palette)).toBeNull();
    expect(swatchOf("Bordeaux", {})).toBeNull();
  });
});

describe("paletteFromChoices : la palette du back-office", () => {
  it("garde les couleurs qui ont une teinte", () => {
    const colors = [
      { id: 1, label: "Orange", hex: "#f47d3c" },
      { id: 2, label: "Transparent", hex: null },
    ];
    expect(paletteFromChoices(colors)).toEqual({ Orange: "#f47d3c" });
    expect(paletteFromChoices(undefined)).toEqual({});
  });
});
