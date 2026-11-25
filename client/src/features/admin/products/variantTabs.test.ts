import { describe, expect, it } from "vitest";
import { emptyVariant, type VariantDraft } from "./productDraft";
import { marginPercent, variantTabs } from "./variantTabs";

// La fenêtre d'une variante en onglets (25/11) : un onglet par thème, et chaque onglet dit ce qui lui manque.
const variant = (condition: VariantDraft["condition"], patch: Partial<VariantDraft> = {}): VariantDraft => ({
  ...emptyVariant(condition, "phone"),
  price: "100000",
  ...patch,
});

const ids = (tabs: ReturnType<typeof variantTabs>) => tabs.map((tab) => tab.id);

describe("variantTabs", () => {
  it("un neuf a quatre onglets : caractéristiques, prix et stock, références, cadeaux", () => {
    expect(ids(variantTabs(variant("new"), { lockedColor: false }))).toEqual(["features", "price", "refs", "gifts"]);
  });

  it("une occasion ajoute l'onglet État, avant les références", () => {
    expect(ids(variantTabs(variant("refurbished"), { lockedColor: false }))).toEqual([
      "features",
      "price",
      "state",
      "refs",
      "gifts",
    ]);
  });

  it("sans cadeaux quand la couleur est imposée (page d'une couleur du Catalogue)", () => {
    expect(ids(variantTabs(variant("new"), { lockedColor: true }))).not.toContain("gifts");
  });

  it("le prix manquant se signale sur Prix et stock", () => {
    const tabs = variantTabs(variant("new", { price: "" }), { lockedColor: false });
    expect(tabs.find((tab) => tab.id === "price")?.problems).toEqual(["prix"]);
    expect(tabs.find((tab) => tab.id === "features")?.problems).toEqual([]);
  });

  it("la boîte et l'origine des pièces se signalent sur État", () => {
    const tabs = variantTabs(
      variant("refurbished", { withBox: null, replacedParts: ["Écran"], partOrigins: {} }),
      { lockedColor: false },
    );
    expect(tabs.find((tab) => tab.id === "state")?.problems).toEqual(["boîte à choisir", "origine des pièces"]);
  });

  it("la garantie hors des bornes se signale sur Références", () => {
    const tabs = variantTabs(variant("new", { warrantyMonths: "40" }), { lockedColor: false });
    expect(tabs.find((tab) => tab.id === "refs")?.problems).toEqual(["garantie"]);
  });

  it("une variante complète n'a aucun problème", () => {
    const tabs = variantTabs(variant("new"), { lockedColor: false });
    expect(tabs.flatMap((tab) => tab.problems)).toEqual([]);
  });
});

describe("marginPercent", () => {
  it("donne la marge sur le prix de vente, arrondie", () => {
    expect(marginPercent("100000", "80000")).toBe(20);
    expect(marginPercent("300000", "200000")).toBe(33);
  });

  it("est négative quand on vend sous le prix d'achat", () => {
    expect(marginPercent("90000", "100000")).toBe(-11);
  });

  it("n'invente rien sans prix d'achat ou sans prix de vente", () => {
    expect(marginPercent("100000", "")).toBeNull();
    expect(marginPercent("", "80000")).toBeNull();
    expect(marginPercent("0", "80000")).toBeNull();
  });
});
