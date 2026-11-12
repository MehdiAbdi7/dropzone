import { describe, expect, it } from "vitest";
import { columnLabels, columnStatus, posterSubtitle, variantHref, variantLabel } from "./accessoryColumns";

describe("variantLabel", () => {
  it("écrit les options dans l'ordre d'une phrase, pas dans l'ordre où la base les range", () => {
    // PostgreSQL range les clés d'un JSONB par longueur : « Câble » avant « Puissance ».
    expect(variantLabel({ Câble: "USB-C", Puissance: "20 W" })).toBe("20 W · USB-C");
    expect(variantLabel({ Couleur: "Noir", Modèle: "iPhone 17 Pro Max" })).toBe("iPhone 17 Pro Max · Noir");
  });

  it("met les options inconnues après, par ordre alphabétique", () => {
    expect(variantLabel({ Zèbre: "z", Puissance: "45 W", Abeille: "a" })).toBe("45 W · a · z");
  });

  it("dit « Standard » pour une variante sans option", () => {
    expect(variantLabel({})).toBe("Standard");
  });
});

describe("columnLabels", () => {
  it("garde chaque nom unique : deux variantes identiques sont numérotées", () => {
    const labels = columnLabels([{ options: { Puissance: "20 W" } }, { options: { Puissance: "20 W" } }, { options: {} }]);
    expect(labels).toEqual(["20 W", "20 W (2)", "Standard"]);
  });
});

describe("variantHref", () => {
  it("mène à la fiche avec les options de la colonne, encodées", () => {
    expect(variantHref("pack-chargeur-anker-nano", { Puissance: "45 W", Câble: "USB-C" })).toBe(
      "/produits/pack-chargeur-anker-nano?Puissance=45%20W&C%C3%A2ble=USB-C",
    );
  });

  it("n'ajoute rien sans option", () => {
    expect(variantHref("coque", {})).toBe("/produits/coque");
  });
});

describe("columnStatus", () => {
  it("dit « Épuisé » sans stock, rien sinon", () => {
    expect(columnStatus(0)).toBe("Épuisé");
    expect(columnStatus(3)).toBeNull();
  });
});

describe("posterSubtitle", () => {
  it("compte les références, au singulier ou au pluriel", () => {
    expect(posterSubtitle(1)).toBe("1 référence");
    expect(posterSubtitle(5)).toBe("5 références");
  });
});
