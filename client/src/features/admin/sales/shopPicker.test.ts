import { describe, expect, it } from "vitest";
import { hitsOfModel, type VariantHit } from "./ticket";

const hit = (sku: string, productName: string): VariantHit => ({
  sku,
  productName,
  options: {},
  condition: "new",
  price: 1000,
  stock: 1,
  conditionReport: null,
  image: null,
});

// La recherche par mots de l'API renvoie aussi « iPhone 15 Pro Max » quand on cherche « iPhone 15 Pro » :
// le parcours par modèle ne doit montrer que les variantes du modèle choisi.
describe("hitsOfModel", () => {
  const hits = [hit("A", "iPhone 15 Pro"), hit("B", "iPhone 15 Pro Max"), hit("C", "iphone 15 pro")];

  it("ne garde que les variantes du modèle, sans tenir compte de la casse", () => {
    expect(hitsOfModel(hits, "iPhone 15 Pro").map((item) => item.sku)).toEqual(["A", "C"]);
  });
  it("montre tout ce qui a été trouvé si aucun nom ne correspond exactement", () => {
    expect(hitsOfModel(hits, "iPhone 15 Pro (2023)")).toEqual(hits);
  });
});
