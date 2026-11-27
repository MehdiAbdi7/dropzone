import { describe, expect, it } from "vitest";
import { DIAGRAM_ZONES, diagramKindOf, zoneAt } from "./diagramShapes";

// Quelle zone du dessin est sous un point (27/11) : une pièce posée à la main prend la zone touchée.
describe("zoneAt", () => {
  it("rend l'écran pour un point au milieu de l'écran d'un téléphone", () => {
    expect(zoneAt("phone", { x: 55, y: 110 })).toBe("screen");
  });

  it("rend la petite zone par-dessus la grande : la caméra avant plutôt que l'écran", () => {
    expect(zoneAt("phone", { x: 55, y: 26 })).toBe("frontCamera");
  });

  it("rend le dos, la batterie puis la caméra arrière selon l'endroit touché sur le dos", () => {
    expect(zoneAt("phone", { x: 135, y: 170 })).toBe("back");
    expect(zoneAt("phone", { x: 165, y: 114 })).toBe("battery");
    expect(zoneAt("phone", { x: 148, y: 38 })).toBe("rearCamera");
  });

  it("rend null hors de toute zone, entre la face et le dos, ou sur une zone sans forme (le cadre)", () => {
    expect(zoneAt("phone", { x: 112, y: 100 })).toBeNull();
    expect(zoneAt("phone", { x: 100, y: 70 })).toBeNull();
    expect(zoneAt("phone", { x: 0, y: 0 })).toBeNull();
  });

  it("garde une petite marge : un clic juste à côté d'un haut-parleur de 3 de haut le touche", () => {
    expect(zoneAt("phone", { x: 55, y: 15 })).toBe("speaker");
  });

  it("suit la forme de chaque appareil : l'écran du PC est dans son capot, le dos d'une montre est rond", () => {
    expect(zoneAt("laptop", { x: 110, y: 56 })).toBe("screen");
    expect(zoneAt("laptop", { x: 44, y: 12 })).toBe("lid");
    expect(zoneAt("watch", { x: 160, y: 100 })).toBe("caseBack");
    expect(zoneAt("watch", { x: 195, y: 100 })).toBe("caseBack");
    expect(zoneAt("watch", { x: 215, y: 100 })).toBeNull();
  });
});

describe("diagramKindOf", () => {
  it("une sorte sans dessin à elle se dessine comme un téléphone", () => {
    expect(diagramKindOf("tablet")).toBe("tablet");
    expect(diagramKindOf("laptop")).toBe("laptop");
    expect(diagramKindOf("watch")).toBe("watch");
    expect(diagramKindOf("phone")).toBe("phone");
    expect(diagramKindOf("accessory")).toBe("phone");
  });
});

describe("DIAGRAM_ZONES", () => {
  it("chaque appareil a ses zones", () => {
    for (const kind of ["phone", "tablet", "laptop", "watch"] as const) {
      expect(DIAGRAM_ZONES[kind].length).toBeGreaterThan(0);
    }
  });
});
