import { describe, expect, it } from "vitest";
import { findLibraryLogo, isLibraryLogo } from "../src/config/brandLogos.js";

describe("findLibraryLogo", () => {
  it("trouve le logo d'une marque de la bibliothèque, quelle que soit l'écriture", () => {
    expect(findLibraryLogo("Samsung")).toBe("/brands/samsung.svg");
    expect(findLibraryLogo("  HP ")).toBe("/brands/hp.svg");
  });

  it("donne le logo du fabricant à un nom de gamme", () => {
    expect(findLibraryLogo("iPhone")).toBe("/brands/apple.svg");
    expect(findLibraryLogo("Apple Watch")).toBe("/brands/apple.svg");
    expect(findLibraryLogo("Galaxy")).toBe("/brands/samsung.svg");
  });

  it("ne trouve rien pour une marque absente de la bibliothèque", () => {
    expect(findLibraryLogo("Realme")).toBeNull();
    expect(findLibraryLogo("GoPro")).toBeNull();
  });
});

describe("isLibraryLogo", () => {
  it("n'accepte que les fichiers de la bibliothèque", () => {
    expect(isLibraryLogo("/brands/apple.svg")).toBe(true);
    expect(isLibraryLogo("/brands/inconnue.svg")).toBe(false);
    expect(isLibraryLogo("https://exemple.com/brands/apple.svg")).toBe(false);
    expect(isLibraryLogo("/brands/../secret.svg")).toBe(false);
  });
});
