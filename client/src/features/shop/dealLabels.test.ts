import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { boxLabel, partOrigin } from "./dealLabels";

// Une réponse de l'API mise en cache avant le 03/11 n'a pas encore ces champs.
const stale = {} as Pick<Variant, "compatibleParts">;

describe("partOrigin", () => {
  it("dit si une pièce changée est compatible ou d'origine", () => {
    expect(partOrigin({ compatibleParts: ["Écran"] }, "Écran")).toBe("compatible");
    expect(partOrigin({ compatibleParts: ["Écran"] }, "Batterie")).toBe("d'origine");
  });

  it("ne promet rien quand l'information manque", () => {
    expect(partOrigin(stale, "Écran")).toBeNull();
  });
});

describe("boxLabel", () => {
  it("dit si l'affaire a sa boîte", () => {
    expect(boxLabel(true)).toBe("Avec sa boîte d'origine");
    expect(boxLabel(false)).toBe("Sans boîte");
  });

  it("ne dit rien quand l'information manque", () => {
    expect(boxLabel(null)).toBeNull();
    expect(boxLabel(undefined)).toBeNull();
  });
});
