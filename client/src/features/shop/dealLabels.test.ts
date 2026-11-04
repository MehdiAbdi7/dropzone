import { describe, expect, it } from "vitest";
import type { Variant } from "@/types/api";
import { boxLabel, dealFacts, partOrigin } from "./dealLabels";

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

  // Une annonce importée qui ne parle pas de la boîte : la base garde null (partie B).
  it("dit « Boîte non précisée » quand l'annonce n'en parle pas", () => {
    expect(boxLabel(null)).toBe("Boîte non précisée");
  });

  it("ne dit rien pour une réponse en cache sans ce champ", () => {
    expect(boxLabel(undefined)).toBeNull();
  });
});

describe("dealFacts : les lignes d'information d'un appareil", () => {
  it("donne la garantie, l'origine et la référence, dans cet ordre", () => {
    expect(dealFacts({ warrantyMonths: 6, origin: "Europe", reference: "51057" })).toEqual([
      "Garantie 6 mois",
      "Origine : Europe",
      "Réf. 51057",
    ]);
  });

  it("ne garde que ce qui est connu", () => {
    expect(dealFacts({ warrantyMonths: 6, origin: null, reference: null })).toEqual(["Garantie 6 mois"]);
    expect(dealFacts({})).toEqual([]);
  });
});
