import { describe, expect, it } from "vitest";
import { isOwnCloseEvent } from "./dialogEvents";

// Une fenêtre dans une fenêtre (le Détail ouvert depuis la recherche de produit) : React fait remonter le
// `onClose` de la fenêtre intérieure jusqu'à la fenêtre extérieure. Chaque fenêtre ne doit réagir qu'à SA
// propre fermeture.
describe("isOwnCloseEvent", () => {
  it("vrai quand la fenêtre qui a reçu l'événement est celle qui l'écoute", () => {
    const dialog = {};
    expect(isOwnCloseEvent({ target: dialog, currentTarget: dialog })).toBe(true);
  });

  it("faux quand l'événement vient d'une fenêtre à l'intérieur", () => {
    expect(isOwnCloseEvent({ target: {}, currentTarget: {} })).toBe(false);
  });
});
