import { describe, expect, it } from "vitest";
import { ctaLabel, glowColor, posterLayout, specIcon, swipeHint, withArticle } from "./series";

describe("withArticle", () => {
  it.each([
    ["iPhone 18 Pro", "l'iPhone 18 Pro"],
    ["iPad Air", "l'iPad Air"],
    ["Galaxy S25", "le Galaxy S25"],
    ["MacBook Pro", "le MacBook Pro"],
    ["HP EliteBook", "le HP EliteBook"],
  ])("%s → %s", (name, expected) => {
    expect(withArticle(name)).toBe(expected);
  });
});

describe("swipeHint", () => {
  const iphones = ["iPhone 18 Pro", "iPhone 18 Pro Max"];

  it("invite à glisser vers le modèle suivant", () => {
    expect(swipeHint(iphones, 0)).toEqual({ text: "Glisse pour voir l'iPhone 18 Pro Max", back: false });
  });

  it("propose de revenir au dernier modèle", () => {
    expect(swipeHint(iphones, 1)).toEqual({ text: "Revenir à l'iPhone 18 Pro", back: true });
  });

  it("accorde l'article avec un nom qui commence par une consonne", () => {
    expect(swipeHint(["Galaxy S25", "Galaxy S25 Ultra"], 0)?.text).toBe("Glisse pour voir le Galaxy S25 Ultra");
    expect(swipeHint(["Galaxy S25", "Galaxy S25 Ultra"], 1)?.text).toBe("Revenir au Galaxy S25");
  });

  it("ne dit rien pour un seul modèle", () => {
    expect(swipeHint(["iPhone 13"], 0)).toBeNull();
  });
});

describe("ctaLabel", () => {
  it("nomme la série dans le bouton d'achat", () => {
    expect(ctaLabel("MacBook Air")).toBe("Acheter un MacBook Air");
  });
});

describe("glowColor", () => {
  it("éclaircit de 25 % la pastille de la couleur", () => {
    // Bordeaux #6b1f2e → (144, 87, 98).
    expect(glowColor("Bordeaux")).toBe("rgba(144, 87, 98, 0.6)");
  });

  it("donne une lueur neutre sans couleur connue", () => {
    expect(glowColor(null)).toBe("rgba(155, 77, 255, 0.35)");
    expect(glowColor("Couleur inconnue")).toBe("rgba(155, 77, 255, 0.35)");
  });
});

describe("posterLayout", () => {
  it("met jusqu'à 4 modèles en colonnes, et fait glisser au-delà", () => {
    expect(posterLayout(1)).toBe("columns");
    expect(posterLayout(4)).toBe("columns");
    expect(posterLayout(5)).toBe("slider");
  });
});

describe("specIcon", () => {
  it.each([
    ["Écran", "screen"],
    ["Puce", "chip"],
    ["Processeur", "chip"],
    ["Appareil photo", "camera"],
    ["Batterie", "battery"],
    ["Autonomie", "battery"],
    ["Connecteur", "plug"],
    ["Ports", "plug"],
    ["RAM", "memory"],
    ["Stockage", "storage"],
    ["Carte graphique", "gpu"],
    ["Poids", "dot"],
  ])("%s → %s", (key, icon) => {
    expect(specIcon(key)).toBe(icon);
  });
});
