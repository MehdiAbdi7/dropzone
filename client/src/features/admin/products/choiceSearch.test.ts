import { describe, expect, it } from "vitest";
import { exactChoice, matchChoices } from "./choiceSearch";

const GPUS = ["RTX 4060", "RTX 4070", "RTX 3060", "Intel Iris Xe", "GTX 1650", "Radeon 780M"];

// La recherche des listes longues du formulaire produit (06/11) : on tape, une courte liste
// filtrée s'ouvre.
describe("matchChoices", () => {
  it("trouve sans casse ni accents, ce qui commence par la recherche en premier", () => {
    expect(matchChoices(GPUS, "60", 8)).toEqual(["RTX 4060", "RTX 3060"]);
    expect(matchChoices(["Bleu", "Bleu ciel", "Noir bleuté"], "bleu", 8)).toEqual(["Bleu", "Bleu ciel", "Noir bleuté"]);
    expect(matchChoices(["Écran", "Batterie"], "ecr", 8)).toEqual(["Écran"]);
    expect(matchChoices(GPUS, "rtx", 8)).toEqual(["RTX 4060", "RTX 4070", "RTX 3060"]);
  });

  it("donne les premières valeurs quand rien n'est tapé, et s'arrête à la limite", () => {
    expect(matchChoices(GPUS, "", 3)).toEqual(["RTX 4060", "RTX 4070", "RTX 3060"]);
    expect(matchChoices(GPUS, "  ", 2)).toEqual(["RTX 4060", "RTX 4070"]);
  });

  it("met chaque mot de la recherche à contribution", () => {
    expect(matchChoices(GPUS, "rtx 40", 8)).toEqual(["RTX 4060", "RTX 4070"]);
  });
});

describe("exactChoice", () => {
  it("reconnaît une valeur déjà dans la liste, même écrite autrement", () => {
    expect(exactChoice(GPUS, "rtx 4060")).toBe("RTX 4060");
    expect(exactChoice(GPUS, "RTX 5090")).toBeNull();
  });
});
