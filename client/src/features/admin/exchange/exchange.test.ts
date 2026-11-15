import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import { buildExchangeBody, buildTradeInBody, differenceText, emptyTradeIn, exchangeDifference, settledText, tradeInProblem, type TradeInDraft } from "./exchange";

// L'échange du comptoir (lot 5) : ce que le client doit payer ou ce que le magasin rend, ce que la
// page refuse tout de suite, et ce qui part vers l'API. Le prix de reprise est saisi à la main.
const model = { id: 7, brand: "Apple", name: "iPhone 15 Pro Max", colors: ["Titane naturel", "Titane noir"] };

// Une reprise complète : le modèle, la couleur, la boîte, la garantie et le prix de reprise.
const draft = (over: Partial<TradeInDraft> = {}, variant: Partial<TradeInDraft["variant"]> = {}): TradeInDraft => {
  const base = emptyTradeIn("phone");
  return {
    ...base,
    model,
    price: "150000",
    ...over,
    variant: {
      ...base.variant,
      options: { Stockage: "256 Go", Couleur: "Titane naturel" },
      warrantyMonths: "3",
      withBox: false,
      ...variant,
    },
  };
};

describe("exchangeDifference", () => {
  it("est positive quand le client paie, négative quand le magasin rend de l'argent", () => {
    expect(exchangeDifference(245_000, 150_000)).toBe(95_000);
    expect(exchangeDifference(185_000, 200_000)).toBe(-15_000);
    expect(exchangeDifference(245_000, 245_000)).toBe(0);
  });
});

describe("differenceText", () => {
  it("dit qui paie", () => {
    expect(differenceText(95_000)).toBe(`Le client doit encore payer ${formatPrice(95_000)}`);
    expect(differenceText(-15_000)).toBe(`Le magasin rend ${formatPrice(15_000)} au client`);
    expect(differenceText(0)).toBe("Aucune différence à payer");
  });
});

describe("settledText", () => {
  it("dit ce qui s'est passé une fois l'échange fait", () => {
    expect(settledText(95_000)).toBe(`Payé par le client : ${formatPrice(95_000)}`);
    expect(settledText(-15_000)).toBe(`Rendu au client : ${formatPrice(15_000)}`);
    expect(settledText(0)).toBe("Aucune différence à payer");
  });
});

describe("emptyTradeIn", () => {
  it("part d'une affaire sans modèle ni prix, avec la garantie de DropZone", () => {
    const empty = emptyTradeIn("phone");
    expect(empty).toMatchObject({ kind: "phone", model: null, price: "" });
    expect(empty.variant.condition).toBe("refurbished");
    expect(empty.variant.warrantyMonths).not.toBe("");
  });
});

describe("tradeInProblem", () => {
  it("accepte une reprise complète", () => {
    expect(tradeInProblem(draft())).toBeNull();
  });

  it("demande le modèle, d'abord", () => {
    expect(tradeInProblem(draft({ model: null }))).toMatch(/modèle/i);
  });

  it("demande la couleur", () => {
    expect(tradeInProblem(draft({}, { options: { Stockage: "256 Go" } }))).toMatch(/couleur/i);
  });

  it("refuse un prix de reprise vide, négatif, à virgule ou énorme : il est saisi à la main", () => {
    for (const price of ["", "  ", "-5", "1.5", "abc", "10000001"]) {
      expect(tradeInProblem(draft({ price })), price).toMatch(/prix de reprise/i);
    }
    expect(tradeInProblem(draft({ price: "0" }))).toBeNull();
  });

  it("exige que la boîte soit dite", () => {
    expect(tradeInProblem(draft({}, { withBox: null }))).toMatch(/boîte/i);
  });

  it("exige la garantie, de 1 à 36 mois", () => {
    for (const warrantyMonths of ["", "0", "37", "abc"]) {
      expect(tradeInProblem(draft({}, { warrantyMonths })), warrantyMonths).toMatch(/garantie/i);
    }
  });

  it("exige l'origine de chaque pièce changée", () => {
    expect(tradeInProblem(draft({}, { replacedParts: ["Écran"], partOrigins: {} }))).toMatch(/Écran/);
    expect(tradeInProblem(draft({}, { replacedParts: ["Écran"], partOrigins: { Écran: "origine" } }))).toBeNull();
  });
});

describe("buildTradeInBody", () => {
  it("sépare la couleur des options et envoie la fiche d'état complète", () => {
    const body = buildTradeInBody(
      draft(
        { price: "150000" },
        {
          grade: "8",
          batteryHealth: "88",
          replacedParts: ["Écran", "Batterie"],
          partOrigins: { Écran: "compatible", Batterie: "origine" },
          defects: ["Rayure légère au dos"],
          details: "Rendu avec son chargeur",
          origin: "Europe",
        },
      ),
    );
    expect(body).toEqual({
      deviceModelId: 7,
      color: "Titane naturel",
      price: 150_000,
      options: { Stockage: "256 Go" },
      grade: 8,
      batteryHealth: 88,
      replacedParts: ["Écran", "Batterie"],
      compatibleParts: ["Écran"],
      defects: ["Rayure légère au dos"],
      limitations: [],
      withBox: false,
      details: "Rendu avec son chargeur",
      warrantyMonths: 3,
      origin: "Europe",
    });
  });
});

describe("buildExchangeBody", () => {
  it("réunit le ticket de ce que le magasin donne et la reprise du client", () => {
    const body = buildExchangeBody({
      lines: [{ key: "a", sku: "IP-NEW-256", name: "iPhone", options: {}, condition: "new", listPrice: 245_000, unitPrice: 240_000, quantity: 1, maxQuantity: 3 }],
      form: { fullName: " Amine Test ", phone: "0555 12 34 56" },
      method: "cash",
      note: "",
      acceptLimitations: false,
      tradeIn: draft(),
    });
    expect(body).toMatchObject({
      fullName: "Amine Test",
      phone: "0555 12 34 56",
      method: "cash",
      acceptLimitations: false,
      // Le prix n'est envoyé que s'il a été négocié.
      lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 240_000 }],
      tradeIn: { deviceModelId: 7, color: "Titane naturel", price: 150_000 },
    });
    expect(body).not.toHaveProperty("note");
  });
});
