import { describe, expect, it } from "vitest";
import { newArrivals, parseAcknowledged, pruneAcknowledged, shouldRingNow, unseenIds } from "./alertLogic";

describe("unseenIds : les commandes en attente qu'on n'a pas encore vues", () => {
  it("garde celles qui ne sont pas dans la liste des « Vu »", () => {
    expect(unseenIds([1, 2, 3], [2])).toEqual([1, 3]);
    expect(unseenIds([1, 2], [])).toEqual([1, 2]);
    expect(unseenIds([], [4])).toEqual([]);
  });
});

describe("pruneAcknowledged : oublier les « Vu » des commandes sorties de l'attente", () => {
  it("ne garde que les commandes encore en attente", () => {
    expect(pruneAcknowledged([1, 2, 9], [2, 3])).toEqual([2]);
  });

  it("une liste vide d'attente vide les « Vu »", () => {
    expect(pruneAcknowledged([1, 2], [])).toEqual([]);
  });
});

describe("shouldRingNow : sonner tout de suite ?", () => {
  it("une vraie nouvelle commande sonne", () => {
    expect(shouldRingNow({ previous: new Set([1]), unseen: [1, 2], wasBlocked: false, blocked: false })).toBe(true);
  });

  it("les mêmes commandes qu'avant ne sonnent pas : seul le rappel de 30 s s'en charge", () => {
    expect(shouldRingNow({ previous: new Set([1, 2]), unseen: [1, 2], wasBlocked: false, blocked: false })).toBe(false);
  });

  it("au premier chargement, des commandes jamais vues sonnent", () => {
    expect(shouldRingNow({ previous: null, unseen: [5], wasBlocked: false, blocked: false })).toBe(true);
  });

  it("le son qui vient d'être débloqué sonne sans attendre le rappel", () => {
    expect(shouldRingNow({ previous: new Set([1]), unseen: [1], wasBlocked: true, blocked: false })).toBe(true);
  });

  it("rien à voir, rien ne sonne", () => {
    expect(shouldRingNow({ previous: new Set(), unseen: [], wasBlocked: true, blocked: false })).toBe(false);
  });
});

describe("newArrivals : les réservations apparues depuis le dernier passage", () => {
  it("au premier passage, rien n'est nouveau (on ne sonne pas pour l'existant)", () => {
    expect(newArrivals(null, [1, 2])).toEqual([]);
  });

  it("ensuite, seules les nouvelles sont retournées", () => {
    expect(newArrivals(new Set([1, 2]), [1, 2, 3])).toEqual([3]);
    expect(newArrivals(new Set([1, 2]), [2])).toEqual([]);
  });
});

describe("parseAcknowledged : relire les « Vu » du disque", () => {
  it("accepte une liste de nombres", () => {
    expect(parseAcknowledged("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("jette ce qui n'est pas un nombre entier, ou un texte cassé", () => {
    expect(parseAcknowledged('[1,"a",2.5,null,4]')).toEqual([1, 4]);
    expect(parseAcknowledged("pas du json")).toEqual([]);
    expect(parseAcknowledged('{"a":1}')).toEqual([]);
    expect(parseAcknowledged(null)).toEqual([]);
  });
});
