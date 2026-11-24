import { describe, expect, it } from "vitest";
import { colorRows, colorsSummary, effectiveGlow, modelCounts } from "./modelCard";

// La carte d'un modèle dans une série (24/11, demande de Mehdi) : toujours le nombre de neufs et d'occasions, le reflet
// de l'affiche choisi sur la carte, et les couleurs avec leur photo dans la fiche.
describe("modelCounts", () => {
  it("lit le stock neuf et le nombre d'occasions de la fiche", () => {
    expect(modelCounts({ newStock: 9, dealCount: 2 })).toEqual({ newStock: 9, deals: 2 });
  });

  it("sans fiche, les deux compteurs restent affichés à zéro", () => {
    expect(modelCounts(null)).toEqual({ newStock: 0, deals: 0 });
  });
});

describe("effectiveGlow", () => {
  it("le reflet choisi, s'il est dans les couleurs du modèle", () => {
    expect(effectiveGlow(["Noir", "Argent"], "Argent")).toBe("Argent");
  });

  it("sinon la première couleur (comme l'affiche de la boutique), ou rien sans couleur", () => {
    expect(effectiveGlow(["Noir", "Argent"], null)).toBe("Noir");
    expect(effectiveGlow(["Noir", "Argent"], "Violet")).toBe("Noir");
    expect(effectiveGlow([], null)).toBeNull();
  });
});

describe("colorRows", () => {
  const colors = [
    { name: "Noir", photoUrl: "https://x/noir.webp", newStock: 2, refurbishedCount: 0 },
    { name: "Argent", photoUrl: null, newStock: 0, refurbishedCount: 1 },
    { name: "Corail", photoUrl: null, newStock: 0, refurbishedCount: 0 },
  ];
  const palette = { Noir: "#111111", Argent: "#cccccc" };

  it("ajoute la teinte réglée dans Listes, et dit ce qui manque", () => {
    expect(colorRows(colors, palette)).toEqual([
      { ...colors[0], hex: "#111111", missingPhoto: false, missingHue: false },
      { ...colors[1], hex: "#cccccc", missingPhoto: true, missingHue: false },
      { ...colors[2], hex: null, missingPhoto: true, missingHue: true },
    ]);
  });
});

describe("colorsSummary", () => {
  it("compte les couleurs et celles sans photo", () => {
    expect(colorsSummary([{ missingPhoto: false }, { missingPhoto: true }, { missingPhoto: true }])).toEqual({
      text: "3 couleurs · 2 sans photo",
      state: "todo",
    });
  });

  it("toutes les photos sont là : rempli, au singulier", () => {
    expect(colorsSummary([{ missingPhoto: false }])).toEqual({ text: "1 couleur · toutes avec photo", state: "done" });
  });

  it("aucune couleur : à compléter", () => {
    expect(colorsSummary([])).toEqual({ text: "Aucune couleur", state: "todo" });
  });
});
