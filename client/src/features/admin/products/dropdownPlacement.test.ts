import { describe, expect, it } from "vitest";
import { dropdownPlacement } from "./dropdownPlacement";

// Où ouvrir la liste d'un champ de recherche (27/11, remarque de Mehdi) : tout en bas de la fenêtre du formulaire, la liste
// s'ouvrait vers le bas et était coupée par le cadre de la fenêtre. Elle s'ouvre maintenant du côté où il y a de la place.
describe("dropdownPlacement", () => {
  it("assez de place dessous : s'ouvre vers le bas à sa hauteur normale", () => {
    expect(dropdownPlacement({ spaceBelow: 500, spaceAbove: 100 })).toEqual({ direction: "down", maxHeight: 288 });
  });

  it("peu de place dessous mais beaucoup dessus : s'ouvre vers le haut", () => {
    expect(dropdownPlacement({ spaceBelow: 60, spaceAbove: 400 })).toEqual({ direction: "up", maxHeight: 288 });
  });

  it("vers le haut, la liste ne dépasse pas la place disponible (marge de 12 px)", () => {
    expect(dropdownPlacement({ spaceBelow: 40, spaceAbove: 200 })).toEqual({ direction: "up", maxHeight: 188 });
  });

  it("place moyenne dessous et plus grande dessus : choisit le haut", () => {
    expect(dropdownPlacement({ spaceBelow: 150, spaceAbove: 300 })).toMatchObject({ direction: "up" });
  });

  it("place correcte dessous (au moins 160 px) et plus grande que dessus : reste en bas, réduite à la place qu'il y a", () => {
    expect(dropdownPlacement({ spaceBelow: 250, spaceAbove: 100 })).toEqual({ direction: "down", maxHeight: 238 });
  });

  it("très peu de place des deux côtés : bas, avec une hauteur minimale lisible (96 px) qui défile", () => {
    expect(dropdownPlacement({ spaceBelow: 50, spaceAbove: 40 })).toEqual({ direction: "down", maxHeight: 96 });
  });
});
