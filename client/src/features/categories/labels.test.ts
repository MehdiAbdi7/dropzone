import { describe, expect, it } from "vitest";
import { countLabel } from "./labels";

describe("countLabel", () => {
  it("compte des modèles pour les appareils et des produits pour le reste", () => {
    expect(countLabel("laptop", 127)).toBe("127 modèles");
    expect(countLabel("phone", 1)).toBe("1 modèle");
    expect(countLabel("accessory", 12)).toBe("12 produits");
    expect(countLabel("accessory", 1)).toBe("1 produit");
  });
});
