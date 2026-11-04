import { describe, expect, it } from "vitest";
import { moveItem } from "./reorder";

describe("moveItem", () => {
  it("descend un élément", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("monte un élément", () => {
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("rend la liste inchangée pour un index hors limites", () => {
    expect(moveItem(["a", "b", "c"], 0, 3)).toEqual(["a", "b", "c"]);
    expect(moveItem(["a", "b", "c"], -1, 1)).toEqual(["a", "b", "c"]);
  });

  it("ne modifie pas la liste d'origine", () => {
    const list = ["a", "b", "c"];
    moveItem(list, 0, 1);
    expect(list).toEqual(["a", "b", "c"]);
  });
});
