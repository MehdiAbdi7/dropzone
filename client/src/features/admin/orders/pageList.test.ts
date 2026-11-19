import { describe, expect, it } from "vitest";
import { pageList } from "./pageList";

// Les numéros de la pagination des listes de commandes (20/11) : « 1 2 3 4 … 24 », la page affichée au milieu.
describe("pageList", () => {
  it("n'a rien à montrer sans page", () => {
    expect(pageList(1, 0)).toEqual([]);
  });

  it("montre toutes les pages quand il y en a peu (7 au plus)", () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("garde la première et la dernière page, et les voisines de la page affichée", () => {
    expect(pageList(3, 24)).toEqual([1, 2, 3, 4, "…", 24]);
    expect(pageList(12, 24)).toEqual([1, "…", 11, 12, 13, "…", 24]);
  });

  it("aux deux bouts de la liste", () => {
    expect(pageList(1, 24)).toEqual([1, 2, "…", 24]);
    expect(pageList(24, 24)).toEqual([1, "…", 23, 24]);
  });

  it("remplace les points de suspension par la page quand elle est seule dans le trou", () => {
    expect(pageList(4, 24)).toEqual([1, 2, 3, 4, 5, "…", 24]);
    expect(pageList(21, 24)).toEqual([1, "…", 20, 21, 22, 23, 24]);
  });

  it("en bas d'une liste de huit pages", () => {
    expect(pageList(7, 8)).toEqual([1, "…", 6, 7, 8]);
  });
});
