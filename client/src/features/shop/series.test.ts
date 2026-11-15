import { describe, expect, it } from "vitest";
import {
  glowColor,
  moveIndex,
  posterLayout,
  posterStatus,
  specIcon,
} from "./series";

// Le mot sous une colonne grisée de l'affiche (règle de Mehdi du 05/11 : toute la série
// reste visible, comme les cartes Neuf et Affaire barrées).
describe("posterStatus", () => {
  it("dit qu'un modèle sans fiche publiée n'est pas encore en vente", () => {
    expect(posterStatus({ onSale: false, soldOut: true })).toBe(
      "Pas encore en vente",
    );
  });

  it("dit qu'un modèle en vente sans stock est épuisé", () => {
    expect(posterStatus({ onSale: true, soldOut: true })).toBe("Épuisé");
  });

  it("ne dit rien d'un modèle qu'on peut acheter", () => {
    expect(posterStatus({ onSale: true, soldOut: false })).toBeNull();
  });
});

// Les flèches ‹ › du sélecteur de modèles et les flèches du clavier dans sa liste :
// un pas en avant ou en arrière, jamais au-delà du premier ou du dernier modèle.
describe("moveIndex", () => {
  it("avance d'un modèle", () => {
    expect(moveIndex(0, 16, 1)).toBe(1);
  });

  it("recule d'un modèle", () => {
    expect(moveIndex(5, 16, -1)).toBe(4);
  });

  it("reste sur le dernier modèle quand on avance", () => {
    expect(moveIndex(15, 16, 1)).toBe(15);
  });

  it("reste sur le premier modèle quand on recule", () => {
    expect(moveIndex(0, 16, -1)).toBe(0);
  });

  it("ne bouge pas pour un seul modèle", () => {
    expect(moveIndex(0, 1, 1)).toBe(0);
    expect(moveIndex(0, 1, -1)).toBe(0);
  });
});

describe("glowColor", () => {
  const palette = { Burgundy: "#6b1f2e", Orange: "#f47d3c" };

  it("éclaircit de 25 % la teinte de la couleur", () => {
    // Burgundy #6b1f2e → (144, 87, 98).
    expect(glowColor("Burgundy", palette)).toBe("rgba(144, 87, 98, 0.6)");
  });

  // Le bug du 04/11 : « Orange » n'avait pas de teinte, la lueur du 17 Pro Max était violette.
  it("suit la palette : une couleur ajoutée par le gérant a sa lueur", () => {
    // Orange #f47d3c → (247, 158, 109).
    expect(glowColor("Orange", palette)).toBe("rgba(247, 158, 109, 0.6)");
  });

  it("donne une lueur neutre sans couleur, ou pour une couleur sans teinte", () => {
    expect(glowColor(null, palette)).toBe("rgba(155, 77, 255, 0.35)");
    expect(glowColor("Couleur inconnue", palette)).toBe(
      "rgba(155, 77, 255, 0.35)",
    );
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
