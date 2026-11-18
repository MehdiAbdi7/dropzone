import { describe, expect, it } from "vitest";
import { hasQuote, nextStatuses, quoteTotal, STATUS_LABELS } from "../src/modules/repairs/repairRules.js";

// Les règles pures de l'atelier (étape 2) : qui peut passer où, et ce que vaut un devis.
describe("nextStatuses", () => {
  it("Reçu : le devis, ou la réparation tout de suite si le client est d'accord", () => {
    expect(nextStatuses("received", false)).toEqual(["quote", "in_repair"]);
  });

  it("Reçu sous garantie : pas de devis", () => {
    expect(nextStatuses("received", true)).toEqual(["in_repair"]);
  });

  it("Devis : accepté ou refusé", () => {
    expect(nextStatuses("quote", false)).toEqual(["in_repair", "to_return"]);
  });

  it("En réparation, Prêt et À rendre n'ont qu'une suite", () => {
    expect(nextStatuses("in_repair", false)).toEqual(["ready"]);
    expect(nextStatuses("in_repair", true)).toEqual(["ready"]);
    expect(nextStatuses("ready", false)).toEqual(["returned"]);
    expect(nextStatuses("to_return", false)).toEqual(["returned"]);
  });

  it("Rendu est la fin : rien ne suit", () => {
    expect(nextStatuses("returned", false)).toEqual([]);
    expect(nextStatuses("returned", true)).toEqual([]);
  });
});

describe("le devis", () => {
  it("vaut les pièces au prix de vente plus la main-d'œuvre", () => {
    expect(quoteTotal(null, [])).toBe(0);
    expect(quoteTotal(5_000, [{ quantity: 2, unitPrice: 3_000 }])).toBe(11_000);
    expect(quoteTotal(null, [{ quantity: 1, unitPrice: 6_000 }, { quantity: 3, unitPrice: 500 }])).toBe(7_500);
  });

  it("est fixé dès qu'il y a une main-d'œuvre (même 0) ou une pièce", () => {
    expect(hasQuote(null, 0)).toBe(false);
    expect(hasQuote(0, 0)).toBe(true);
    expect(hasQuote(null, 1)).toBe(true);
  });
});

describe("les libellés", () => {
  it("nomment chaque étape", () => {
    expect(STATUS_LABELS.in_repair).toBe("En réparation");
    expect(STATUS_LABELS.to_return).toBe("À rendre sans réparation");
    expect(Object.keys(STATUS_LABELS)).toHaveLength(6);
  });
});
