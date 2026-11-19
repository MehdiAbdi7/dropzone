import { describe, expect, it } from "vitest";
import { emptyTradeIn, type TradeInDraft } from "@/features/admin/exchange/exchange";
import { makeHit } from "@/features/admin/sales/variantHit.fixture";
import { formatPrice } from "@/lib/format";
import { historyAmountText, paidText, repairCapabilities } from "./repairsView";
import { buildReplaceBody, canReplace, givenModelMatches, replaceDifference, replaceProblem } from "./replaceRules";

// Remplacer l'appareil sous garantie (atelier, étape 6) : la différence annoncée avant d'envoyer (le serveur refait le
// même calcul), ce que l'écran refuse tout de suite, et ce qui part vers l'API. Le prix de reprise n'existe pas ici.
const model = { id: 7, brand: "Apple", name: "iPhone 15 Pro Max", colors: ["Titane naturel"] };

// L'appareil en panne : une fiche d'état complète, SANS prix de reprise.
const brokenPhone = (variant: Partial<TradeInDraft["variant"]> = {}): TradeInDraft => {
  const base = emptyTradeIn("phone");
  return {
    ...base,
    model,
    variant: { ...base.variant, options: { Stockage: "256 Go", Couleur: "Titane naturel" }, warrantyMonths: "3", withBox: false, ...variant },
  };
};

const origin = { unitPrice: 200_000, productId: 4, storage: "256 Go" };

describe("givenModelMatches", () => {
  it("même produit et même stockage : le même modèle", () => {
    expect(givenModelMatches(origin, makeHit({ productId: 4, options: { Stockage: "256 Go", Couleur: "Noir" } }))).toBe(true);
  });
  it("un autre stockage ou un autre produit : pas le même modèle", () => {
    expect(givenModelMatches(origin, makeHit({ productId: 4, options: { Stockage: "512 Go" } }))).toBe(false);
    expect(givenModelMatches(origin, makeHit({ productId: 5, options: { Stockage: "256 Go" } }))).toBe(false);
  });
  it("un PC sans stockage des deux côtés : le même produit suffit", () => {
    expect(givenModelMatches({ ...origin, storage: null }, makeHit({ productId: 4, options: {} }))).toBe(true);
  });
  it("un article d'origine sans produit : jamais le même modèle", () => {
    expect(givenModelMatches({ ...origin, productId: null }, makeHit({ productId: 4 }))).toBe(false);
  });
});

describe("replaceDifference", () => {
  it("même modèle : rien à payer, quel que soit le prix d'aujourd'hui", () => {
    expect(replaceDifference(origin, makeHit({ productId: 4, price: 245_000 }))).toBe(0);
  });
  it("un autre modèle : le prix donné moins le prix PAYÉ à l'origine", () => {
    expect(replaceDifference({ ...origin, unitPrice: 150_000 }, makeHit({ productId: 9, price: 185_000, options: {} }))).toBe(35_000);
    expect(replaceDifference(origin, makeHit({ productId: 9, price: 185_000, options: {} }))).toBe(-15_000);
  });
});

describe("canReplace", () => {
  const repair = { underWarranty: true, status: "in_repair" as const, replacementOrderNumber: null, origin };
  it("sous garantie, en cours, jamais remplacée, avec sa vente d'origine : oui", () => {
    expect(canReplace(repair, true)).toBe(true);
    expect(canReplace({ ...repair, status: "received" }, true)).toBe(true);
  });
  it("refuse hors garantie, une fiche prête ou rendue, déjà remplacée, sans vente d'origine, ou sans le droit", () => {
    expect(canReplace({ ...repair, underWarranty: false }, true)).toBe(false);
    expect(canReplace({ ...repair, status: "ready" }, true)).toBe(false);
    expect(canReplace({ ...repair, status: "returned" }, true)).toBe(false);
    expect(canReplace({ ...repair, replacementOrderNumber: 1003 }, true)).toBe(false);
    expect(canReplace({ ...repair, origin: null }, true)).toBe(false);
    expect(canReplace(repair, false)).toBe(false);
  });
});

describe("replaceProblem", () => {
  const given = makeHit({ productId: 9, price: 185_000, options: {} });
  it("demande d'abord l'appareil donné", () => {
    expect(replaceProblem({ origin, given: null, tradeIn: brokenPhone(), method: null, acceptLimitations: false })).toContain("appareil");
  });
  it("refuse une fiche d'état incomplète de l'appareil en panne", () => {
    const incomplete = { ...brokenPhone(), model: null };
    expect(replaceProblem({ origin, given, tradeIn: incomplete, method: "cash", acceptLimitations: false })).toContain("modèle");
  });
  it("demande le moyen de paiement seulement quand il y a de l'argent à échanger", () => {
    expect(replaceProblem({ origin, given, tradeIn: brokenPhone(), method: null, acceptLimitations: false })).toContain("paiement");
    const same = makeHit({ productId: 4 });
    expect(replaceProblem({ origin, given: same, tradeIn: brokenPhone(), method: null, acceptLimitations: false })).toBeNull();
  });
  it("demande l'accord du client sur les limitations d'un reconditionné", () => {
    const limited = makeHit({ productId: 4, limitations: ["Wi-Fi seulement"] });
    expect(replaceProblem({ origin, given: limited, tradeIn: brokenPhone(), method: "cash", acceptLimitations: false })).toContain("limitations");
    expect(replaceProblem({ origin, given: limited, tradeIn: brokenPhone(), method: "cash", acceptLimitations: true })).toBeNull();
  });
});

describe("buildReplaceBody", () => {
  it("envoie l'article donné, le moyen et l'appareil en panne, sans prix de reprise", () => {
    const body = buildReplaceBody({ sku: "IP-NEW-256", method: "cash", acceptLimitations: true, tradeIn: brokenPhone() });
    expect(body).toMatchObject({ method: "cash", acceptLimitations: true, line: { sku: "IP-NEW-256" } });
    expect(body.tradeIn).toMatchObject({ deviceModelId: 7, color: "Titane naturel", options: { Stockage: "256 Go" }, warrantyMonths: 3 });
    expect("price" in body.tradeIn).toBe(false);
  });
});

describe("une fiche rendue par un remplacement", () => {
  it("dit ce que le client a payé, ou ce que le magasin lui a rendu quand le montant est négatif", () => {
    expect(paidText({ paidAmount: 35_000, payMethod: "cash", returnedOn: "2026-11-16" })).toContain(formatPrice(35_000));
    const refund = paidText({ paidAmount: -15_000, payMethod: "cash", returnedOn: "2026-11-16" });
    expect(refund).toContain(`Rendu au client ${formatPrice(15_000)}`);
    expect(refund).not.toContain("-");
  });
  it("le vendeur, le responsable et l'admin remplacent ; le technicien non", () => {
    expect(repairCapabilities("admin").replacesDevice).toBe(true);
    expect(repairCapabilities("seller").replacesDevice).toBe(true);
    expect(repairCapabilities("order_manager").replacesDevice).toBe(true);
    expect(repairCapabilities("technician").replacesDevice).toBe(false);
    expect(repairCapabilities("customer").replacesDevice).toBe(false);
  });
});

describe("historyAmountText", () => {
  it("dit l'argent d'une fiche dans l'Historique : payé, rendu au client, ou rien", () => {
    expect(historyAmountText(35_000, "cash")).toBe(`${formatPrice(35_000)} · Espèces`);
    expect(historyAmountText(35_000, null)).toBe(formatPrice(35_000));
    expect(historyAmountText(-15_000, "cash")).toBe(`Rendu au client ${formatPrice(15_000)} · Espèces`);
    expect(historyAmountText(0, null)).toBe("Rien payé");
  });
});
