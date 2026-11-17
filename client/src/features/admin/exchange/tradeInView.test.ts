import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import { buildTradeInUpdateBody, marginText, resaleProblem, resalePrice, sheetSummary, tradeInToDraft } from "./tradeInView";

// La liste des reprises à mettre en vente (lot 5) : le prix de revente et la marge.
describe("resalePrice et resaleProblem", () => {
  it("lit un nombre entier de dinars", () => {
    expect(resalePrice("175000")).toBe(175_000);
    expect(resalePrice(" 0 ")).toBe(0);
    expect(resaleProblem("175000")).toBeNull();
  });

  it("refuse un prix vide, à virgule, négatif, en lettres ou énorme", () => {
    for (const text of ["", "  ", "1.5", "-5", "abc", "10000001"]) {
      expect(resaleProblem(text), text).toMatch(/prix de revente/i);
    }
  });
});

describe("marginText", () => {
  it("dit la marge, ou que la revente est à perte", () => {
    expect(marginText(175_000, 150_000)).toBe(`Marge : ${formatPrice(25_000)}`);
    expect(marginText(140_000, 150_000)).toBe(`À perte : ${formatPrice(10_000)} de moins que la reprise`);
    expect(marginText(150_000, 150_000)).toBe("Aucune marge : au prix de la reprise");
  });

  it("ne dit rien tant que le prix n'est pas tapé", () => {
    expect(marginText(Number.NaN, 150_000)).toBeNull();
  });
});

describe("sheetSummary", () => {
  it("résume la fiche d'état en une ligne", () => {
    expect(sheetSummary({ grade: 8, batteryHealth: 88, defects: ["Rayure"], replacedParts: [], withBox: false })).toBe(
      "8/10 · batterie 88 % · 1 défaut · sans boîte",
    );
  });

  it("accorde les pluriels et omet ce qui manque", () => {
    expect(sheetSummary({ defects: ["A", "B"], replacedParts: ["Écran", "Batterie"], withBox: true })).toBe(
      "2 défauts · 2 pièces changées · avec sa boîte",
    );
    expect(sheetSummary({})).toBe("");
  });
});

// Modifier une reprise avant sa mise en vente (18/11) : la fiche enregistrée revient dans le formulaire,
// et le corps envoyé à l'API porte la couleur, les options, la fiche et les frais de remise en état.
const row = {
  id: 7,
  orderId: 1,
  orderNumber: 1,
  dailyNumber: 1,
  businessDate: "2026-11-18",
  customerName: "Amine",
  customerPhone: "0555123456",
  deviceModel: { id: 4, brand: "iPhone", name: "iPhone 15 Pro Max", kind: "phone" as const },
  color: "Titane naturel",
  price: 150_000,
  repairCost: 0,
  sheet: {
    options: { Stockage: "256 Go" },
    grade: 8,
    batteryHealth: 74,
    replacedParts: ["Écran"],
    compatibleParts: ["Écran"],
    defects: ["Rayure"],
    limitations: [],
    withBox: false,
    details: "Avec chargeur",
    warrantyMonths: 3,
    origin: "Europe",
  },
  createdAt: "2026-11-18T10:00:00Z",
  listedAt: null,
  listedVariantId: null,
};

describe("tradeInToDraft", () => {
  it("remet la fiche enregistrée dans le formulaire, couleur comprise", () => {
    const draft = tradeInToDraft(row);
    expect(draft.model).toMatchObject({ id: 4, name: "iPhone 15 Pro Max" });
    expect(draft.variant.options).toMatchObject({ Stockage: "256 Go", Couleur: "Titane naturel" });
    expect(draft.variant).toMatchObject({ grade: "8", batteryHealth: "74", warrantyMonths: "3", withBox: false, origin: "Europe" });
    expect(draft.variant.partOrigins).toEqual({ Écran: "compatible" });
    expect(draft.price).toBe("150000");
    expect(draft.repairCost).toBe("");
  });
  it("montre les frais déjà saisis", () => {
    expect(tradeInToDraft({ ...row, repairCost: 8_000 }).repairCost).toBe("8000");
  });
});

describe("buildTradeInUpdateBody", () => {
  it("envoie la fiche changée (batterie neuve) et les frais, jamais le modèle ni le prix de reprise", () => {
    const draft = tradeInToDraft(row);
    const body = buildTradeInUpdateBody({
      ...draft,
      repairCost: "8000",
      variant: { ...draft.variant, batteryHealth: "100", replacedParts: ["Écran", "Batterie"], partOrigins: { Écran: "compatible", Batterie: "origine" } },
    });
    expect(body).toMatchObject({
      color: "Titane naturel",
      options: { Stockage: "256 Go" },
      batteryHealth: 100,
      replacedParts: ["Écran", "Batterie"],
      compatibleParts: ["Écran"],
      repairCost: 8_000,
    });
    expect(body).not.toHaveProperty("deviceModelId");
    expect(body).not.toHaveProperty("price");
  });
  it("les frais vides valent 0", () => {
    expect(buildTradeInUpdateBody(tradeInToDraft(row)).repairCost).toBe(0);
  });
});

describe("marginText avec la remise en état", () => {
  it("le prix d'achat est la reprise plus les frais", () => {
    expect(marginText(175_000, 150_000 + 8_000)).toBe(`Marge : ${formatPrice(17_000)}`);
  });
});
