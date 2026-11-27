import { describe, expect, it } from "vitest";
import { hasZone, zonesOf } from "./diagramZones";

// Ce que le dessin montre quand une valeur n'a pas de point posé à la main.
const nothing = { replacedDots: [], defectDots: [] };

describe("zonesOf", () => {
  it("place les pièces d'une tablette comme celles d'un téléphone", () => {
    expect(zonesOf({ replacedParts: ["Écran"], defects: ["Coins marqués"] }, "tablet")).toEqual({
      replaced: ["screen"],
      defects: ["corners"],
      ...nothing,
      unplaced: [],
    });
  });

  it("place une pièce changée et un défaut connus, et garde le reste pour la légende", () => {
    expect(
      zonesOf({ replacedParts: ["Écran"], defects: ["Cache arrière fissuré", "Rayure inventée"] }, "phone"),
    ).toEqual({ replaced: ["screen"], defects: ["back"], ...nothing, unplaced: ["Rayure inventée"] });
  });

  it("ne place pas sur un téléphone un défaut propre aux PC", () => {
    expect(zonesOf({ replacedParts: [], defects: ["Usure du repose-poignets"] }, "phone")).toEqual({
      replaced: [],
      defects: [],
      ...nothing,
      unplaced: ["Usure du repose-poignets"],
    });
    expect(zonesOf({ replacedParts: ["Clavier"], defects: ["Usure du repose-poignets"] }, "laptop")).toEqual({
      replaced: ["keyboard"],
      defects: ["palmRest"],
      ...nothing,
      unplaced: [],
    });
  });

  it("ne renvoie rien pour un appareil sans réparation ni défaut", () => {
    expect(zonesOf({ replacedParts: [], defects: [] }, "watch")).toEqual({
      replaced: [],
      defects: [],
      ...nothing,
      unplaced: [],
    });
  });
});

// Une valeur ajoutée à la main n'est dans aucune zone : le point posé par le gérant la place (27/11).
describe("zonesOf, valeurs ajoutées à la main", () => {
  const marks = (parts: Record<string, { x: number; y: number }>, defects: Record<string, { x: number; y: number }> = {}) => ({
    parts,
    defects,
  });

  it("un défaut ajouté à la main devient un point rouge exactement où le gérant l'a posé", () => {
    const point = { x: 73.5, y: 140.2 };
    expect(
      zonesOf({ replacedParts: [], defects: ["Bouton volume cassé"], diagramMarks: marks({}, { "Bouton volume cassé": point }) }, "phone"),
    ).toEqual({ replaced: [], defects: [], replacedDots: [], defectDots: [point], unplaced: [] });
  });

  it("une pièce ajoutée à la main colore en bleu la zone sous le point (l'écran entier pour le verre de l'écran)", () => {
    expect(
      zonesOf(
        { replacedParts: ["Verre de l'écran"], defects: [], diagramMarks: marks({ "Verre de l'écran": { x: 55, y: 110 } }) },
        "phone",
      ),
    ).toEqual({ replaced: ["screen"], defects: [], ...nothing, unplaced: [] });
  });

  it("l'afficheur de la liste et le verre ajouté à la main colorent la même zone, l'écran", () => {
    const result = zonesOf(
      {
        replacedParts: ["Afficheur", "Verre de l'écran"],
        defects: [],
        diagramMarks: marks({ "Verre de l'écran": { x: 40, y: 60 } }),
      },
      "phone",
    );
    expect(result.replaced).toEqual(["screen", "screen"]);
  });

  it("une pièce ajoutée à la main hors de toute zone devient un point bleu", () => {
    const point = { x: 112, y: 100 };
    // Entre la face et le dos du dessin du téléphone : aucune zone n'y est.
    expect(
      zonesOf({ replacedParts: ["Tranche"], defects: [], diagramMarks: marks({ Tranche: point }) }, "phone"),
    ).toEqual({ replaced: [], defects: [], replacedDots: [point], defectDots: [], unplaced: [] });
  });

  it("une valeur ajoutée à la main sans point reste dans la légende seule (anciennes fiches)", () => {
    expect(
      zonesOf({ replacedParts: ["Verre de l'écran"], defects: ["Bouton volume cassé"], diagramMarks: marks({}) }, "phone"),
    ).toEqual({ replaced: [], defects: [], ...nothing, unplaced: ["Verre de l'écran", "Bouton volume cassé"] });
  });

  it("le point d'une valeur de la liste est ignoré : la zone connue gagne", () => {
    expect(
      zonesOf({ replacedParts: ["Batterie"], defects: [], diagramMarks: marks({ Batterie: { x: 55, y: 110 } }) }, "phone"),
    ).toEqual({ replaced: ["battery"], defects: [], ...nothing, unplaced: [] });
  });
});

describe("hasZone", () => {
  it("dit si la valeur est dans la liste de zones de l'appareil", () => {
    expect(hasZone("Écran", "phone")).toBe(true);
    expect(hasZone("Verre de l'écran", "phone")).toBe(false);
    expect(hasZone("Clavier", "laptop")).toBe(true);
    expect(hasZone("Clavier", "phone")).toBe(false);
  });
});
