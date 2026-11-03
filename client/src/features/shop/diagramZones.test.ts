import { describe, expect, it } from "vitest";
import { zonesOf } from "./diagramZones";

describe("zonesOf", () => {
  it("place une pièce changée et un défaut connus, et garde le reste pour la légende", () => {
    expect(
      zonesOf({ replacedParts: ["Écran"], defects: ["Cache arrière fissuré", "Rayure inventée"] }, "phone"),
    ).toEqual({ replaced: ["screen"], defects: ["back"], unplaced: ["Rayure inventée"] });
  });

  it("ne place pas sur un téléphone un défaut propre aux PC", () => {
    expect(zonesOf({ replacedParts: [], defects: ["Usure du repose-poignets"] }, "phone")).toEqual({
      replaced: [],
      defects: [],
      unplaced: ["Usure du repose-poignets"],
    });
    expect(zonesOf({ replacedParts: ["Clavier"], defects: ["Usure du repose-poignets"] }, "laptop")).toEqual({
      replaced: ["keyboard"],
      defects: ["palmRest"],
      unplaced: [],
    });
  });

  it("ne renvoie rien pour un appareil sans réparation ni défaut", () => {
    expect(zonesOf({ replacedParts: [], defects: [] }, "watch")).toEqual({ replaced: [], defects: [], unplaced: [] });
  });
});
