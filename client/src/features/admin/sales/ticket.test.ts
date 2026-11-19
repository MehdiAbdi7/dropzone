import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import { makeHit } from "./variantHit.fixture";
import {
  addedMessage,
  addToTicket,
  pickedMessage,
  removeFromTicket,
  belowPurchasePrice,
  buildSaleBody,
  clientReady,
  pricesToSend,
  reductionText,
  syncCatalogPrices,
  ticketProblem,
  ticketQuantities,
  ticketReduction,
  ticketTotal,
  type TicketLine,
} from "./ticket";

// Le ticket de la vente au magasin (16/11, lot 3) : ce qui s'affiche et ce qui part vers l'API.
const hit = makeHit();
const line = (over: Partial<TicketLine> = {}): TicketLine => ({
  hit,
  key: "IP-NEW-256",
  sku: "IP-NEW-256",
  name: "iPhone 15 Pro Max",
  options: {},
  condition: "new",
  listPrice: 245_000,
  unitPrice: 245_000,
  quantity: 1,
  maxQuantity: 3,
  ...over,
});
const form = { fullName: "Amine Test", phone: "0555 12 34 56" };

describe("addToTicket", () => {
  it("ajoute une variante au prix catalogue, avec le stock pour limite", () => {
    const lines = addToTicket([], hit);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ sku: "IP-NEW-256", name: "iPhone 15 Pro Max", listPrice: 245_000, unitPrice: 245_000, quantity: 1, maxQuantity: 3 });
  });

  it("ajoute 1 à la quantité quand la variante est déjà là, sans dépasser le stock", () => {
    let lines = addToTicket([], hit);
    lines = addToTicket(lines, hit);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
    lines = addToTicket(addToTicket(lines, hit), hit);
    expect(lines[0].quantity).toBe(3);
  });

  it("plafonne la quantité à 10 par ligne même avec un gros stock", () => {
    const big = { ...hit, stock: 50 };
    let lines = addToTicket([], big);
    for (let i = 0; i < 20; i += 1) lines = addToTicket(lines, big);
    expect(lines[0].quantity).toBe(10);
    expect(lines[0].maxQuantity).toBe(10);
  });
});

describe("ticketTotal et ticketReduction", () => {
  it("additionne prix accordé × quantité", () => {
    expect(ticketTotal([line({ quantity: 2, unitPrice: 240_000 }), line({ sku: "B", key: "B", unitPrice: 1_000 })])).toBe(481_000);
  });

  it("compte la réduction : (prix catalogue − prix accordé) × quantité", () => {
    expect(ticketReduction([line({ quantity: 2, unitPrice: 240_000 })])).toBe(10_000);
    expect(ticketReduction([line()])).toBe(0);
  });

  it("est négative quand le prix dépasse le catalogue", () => {
    expect(ticketReduction([line({ unitPrice: 250_000 })])).toBe(-5_000);
  });

  it("donne NaN pour le total tant qu'un prix est vide, sans fausser la réduction", () => {
    expect(Number.isNaN(ticketTotal([line({ unitPrice: Number.NaN })]))).toBe(true);
    expect(ticketReduction([line({ unitPrice: Number.NaN })])).toBe(0);
  });
});

describe("ticketProblem", () => {
  it("accepte un ticket correct", () => {
    expect(ticketProblem([line()], form)).toBeNull();
  });
  it("refuse un ticket vide", () => {
    expect(ticketProblem([], form)).toMatch(/vide/);
  });
  it("refuse un nom trop court et un téléphone invalide", () => {
    expect(ticketProblem([line()], { ...form, fullName: "Al" })).toMatch(/nom/i);
    expect(ticketProblem([line()], { ...form, phone: "123" })).toMatch(/téléphone/i);
    expect(ticketProblem([line()], { ...form, phone: "0555-12.34 56" })).toBeNull();
  });
  it("refuse une quantité hors de 1 au stock et un prix négatif, non entier, vide ou trop grand", () => {
    expect(ticketProblem([line({ quantity: 0 })], form)).toMatch(/quantité/i);
    expect(ticketProblem([line({ quantity: 4 })], form)).toMatch(/quantité/i);
    expect(ticketProblem([line({ unitPrice: -1 })], form)).toMatch(/prix/i);
    expect(ticketProblem([line({ unitPrice: 10.5 })], form)).toMatch(/prix/i);
    expect(ticketProblem([line({ unitPrice: Number.NaN })], form)).toMatch(/prix/i);
    expect(ticketProblem([line({ unitPrice: 10_000_001 })], form)).toMatch(/prix/i);
  });
  it("accepte un prix à 0", () => {
    expect(ticketProblem([line({ unitPrice: 0 })], form)).toBeNull();
  });
});

describe("buildSaleBody", () => {
  it("envoie les lignes avec leur prix accordé, le moyen de paiement et les limitations", () => {
    const body = buildSaleBody({
      lines: [line({ quantity: 2, unitPrice: 240_000 })],
      form: { fullName: " Amine Test ", phone: "0555 12 34 56" },
      method: "card",
      note: " Vu à l'Instagram ",
      acceptLimitations: true,
    });
    expect(body).toEqual({
      fullName: "Amine Test",
      phone: "0555 12 34 56",
      method: "card",
      note: "Vu à l'Instagram",
      acceptLimitations: true,
      lines: [{ sku: "IP-NEW-256", quantity: 2, unitPrice: 240_000 }],
    });
  });

  it("n'envoie le prix d'une ligne que s'il a été négocié : sinon le serveur prend le prix catalogue d'aujourd'hui", () => {
    const body = buildSaleBody({
      lines: [line({ quantity: 1 }), line({ sku: "B", key: "B", listPrice: 1_000, unitPrice: 900 })],
      form,
      method: "cash",
      note: "",
      acceptLimitations: false,
    });
    expect(body.lines).toEqual([{ sku: "IP-NEW-256", quantity: 1 }, { sku: "B", quantity: 1, unitPrice: 900 }]);
  });

  it("n'envoie pas de remarque vide", () => {
    const body = buildSaleBody({ lines: [line()], form, method: "cash", note: "  ", acceptLimitations: false });
    expect(body).not.toHaveProperty("note");
  });
});

describe("syncCatalogPrices", () => {
  it("ne change rien quand le prix catalogue est toujours le même (et rend le même tableau)", () => {
    const lines = [line()];
    const result = syncCatalogPrices(lines, [{ sku: "IP-NEW-256", unitPrice: 245_000 }]);
    expect(result.lines).toBe(lines);
    expect(result.changed).toEqual([]);
  });

  it("met à jour le prix catalogue périmé, et le prix accordé quand il n'avait pas été négocié", () => {
    const result = syncCatalogPrices([line()], [{ sku: "IP-NEW-256", unitPrice: 239_000 }]);
    expect(result.lines[0]).toMatchObject({ listPrice: 239_000, unitPrice: 239_000 });
    expect(result.changed).toEqual(["iPhone 15 Pro Max"]);
  });

  it("garde le prix négocié du vendeur quand le catalogue change", () => {
    const result = syncCatalogPrices([line({ unitPrice: 240_000 })], [{ sku: "IP-NEW-256", unitPrice: 239_000 }]);
    expect(result.lines[0]).toMatchObject({ listPrice: 239_000, unitPrice: 240_000 });
  });

  it("ignore une ligne que le récapitulatif ne connaît pas encore", () => {
    const lines = [line()];
    expect(syncCatalogPrices(lines, []).lines).toBe(lines);
  });
});

describe("reductionText", () => {
  it("écrit le prix catalogue, le prix accordé et la différence", () => {
    expect(reductionText(line({ unitPrice: 240_000 }))).toBe(
      `${formatPrice(245_000)} → ${formatPrice(240_000)}, −${formatPrice(5_000)}`,
    );
    expect(reductionText(line({ unitPrice: 250_000 }))).toBe(
      `${formatPrice(245_000)} → ${formatPrice(250_000)}, +${formatPrice(5_000)}`,
    );
  });
  it("ne dit rien sans réduction, ni quand le prix est encore vide", () => {
    expect(reductionText(line())).toBeNull();
    expect(reductionText(line({ unitPrice: Number.NaN }))).toBeNull();
  });
});

describe("pricesToSend", () => {
  it("n'envoie que les prix changés", () => {
    expect(
      pricesToSend([
        { id: 1, unitPrice: 240_000, originalPrice: 245_000 },
        { id: 2, unitPrice: 1_000, originalPrice: 1_000 },
      ]),
    ).toEqual([{ id: 1, unitPrice: 240_000 }]);
  });
  it("n'envoie rien quand rien n'a changé, ni un prix encore vide", () => {
    expect(pricesToSend([{ id: 1, unitPrice: 245_000, originalPrice: 245_000 }])).toEqual([]);
    expect(pricesToSend([{ id: 1, unitPrice: Number.NaN, originalPrice: 245_000 }])).toEqual([]);
  });
});

describe("clientReady", () => {
  it("est vrai avec un nom d'au moins 3 caractères et un vrai numéro", () => {
    expect(clientReady({ fullName: "Sami Benali", phone: "0555 12 34 56" })).toBe(true);
  });
  it("est faux si le nom est trop court ou le numéro invalide", () => {
    expect(clientReady({ fullName: "Sa", phone: "0555123456" })).toBe(false);
    expect(clientReady({ fullName: "Sami Benali", phone: "12345" })).toBe(false);
    expect(clientReady({ fullName: "", phone: "" })).toBe(false);
  });
});

// La limite de la négociation (18/11) : le vendeur voit le prix d'achat et un avertissement quand il descend dessous.
describe("belowPurchasePrice", () => {
  it("dit vrai seulement quand le prix accordé est sous le prix d'achat", () => {
    expect(belowPurchasePrice(180_000, 200_000)).toBe(true);
    expect(belowPurchasePrice(200_000, 200_000)).toBe(false);
    expect(belowPurchasePrice(250_000, 200_000)).toBe(false);
  });

  it("ne dit rien quand le prix est vide ou que le prix d'achat est inconnu", () => {
    expect(belowPurchasePrice(Number.NaN, 200_000)).toBe(false);
    expect(belowPurchasePrice(100, null)).toBe(false);
  });
});

describe("addToTicket : la fiche suit la ligne", () => {
  it("garde la variante trouvée, pour le bouton Détail du ticket", () => {
    expect(addToTicket([], hit)[0].hit).toBe(hit);
  });
});

// Le retour d'un ajout (19/11) : la recherche de produit reste ouverte, chaque carte dit combien de fois
// l'appareil est déjà dans le ticket, pour qu'un clic ne passe jamais inaperçu.
describe("ticketQuantities", () => {
  it("donne la quantité de chaque appareil du ticket, par SKU", () => {
    const lines = [line({ sku: "A", quantity: 2, maxQuantity: 5 }), line({ sku: "B", quantity: 1, maxQuantity: 1 })];
    expect(ticketQuantities(lines)).toEqual({
      A: { quantity: 2, atLimit: false },
      B: { quantity: 1, atLimit: true },
    });
  });

  it("n'a rien pour un appareil absent du ticket, et rien pour un ticket vide", () => {
    expect(ticketQuantities([])).toEqual({});
    expect(ticketQuantities([line({ sku: "A" })]).Z).toBeUndefined();
  });
});

describe("addedMessage", () => {
  it("un premier ajout dit simplement qu'il est ajouté", () => {
    expect(addedMessage("iPhone 15 Pro Max", { quantity: 1, atLimit: false })).toBe("Ajouté au ticket : iPhone 15 Pro Max");
  });

  it("un deuxième clic change le message : il donne la quantité", () => {
    expect(addedMessage("iPhone 15 Pro Max", { quantity: 2, atLimit: false })).toBe("iPhone 15 Pro Max : 2 au ticket");
  });

  it("dit quand le stock est atteint, y compris pour le dernier exemplaire", () => {
    expect(addedMessage("iPhone 15 Pro Max", { quantity: 3, atLimit: true })).toBe("iPhone 15 Pro Max : 3 au ticket (stock atteint)");
    expect(addedMessage("iPhone 15 Pro Max", { quantity: 1, atLimit: true })).toBe("iPhone 15 Pro Max : 1 au ticket (stock atteint)");
  });

  it("sans quantité connue (autre page), garde le message simple", () => {
    expect(addedMessage("Coque", undefined)).toBe("Ajouté au ticket : Coque");
  });
});

// Le « − » de la carte : retire un exemplaire, et la ligne disparaît quand il n'en reste plus.
describe("removeFromTicket", () => {
  it("retire un exemplaire de la ligne", () => {
    const lines = [line({ sku: "A", quantity: 3 })];
    expect(removeFromTicket(lines, "A")).toEqual([line({ sku: "A", quantity: 2 })]);
  });

  it("retire la ligne quand il n'en reste qu'un", () => {
    expect(removeFromTicket([line({ sku: "A", quantity: 1 }), line({ sku: "B", key: "B", quantity: 2 })], "A")).toEqual([
      line({ sku: "B", key: "B", quantity: 2 }),
    ]);
  });

  it("ne touche à rien pour un appareil absent du ticket", () => {
    const lines = [line({ sku: "A" })];
    expect(removeFromTicket(lines, "Z")).toBe(lines);
  });
});

// Le message du haut de la recherche, à jour après un ajout comme après un retrait.
describe("pickedMessage", () => {
  const quantities = { A: { quantity: 2, atLimit: false } };

  it("donne la quantité d'un appareil encore dans le ticket", () => {
    expect(pickedMessage("iPhone", "A", quantities)).toBe("iPhone : 2 au ticket");
  });

  it("dit que l'appareil est retiré quand il a quitté le ticket", () => {
    expect(pickedMessage("iPhone", "Z", quantities)).toBe("iPhone : retiré du ticket");
  });

  it("garde le message simple quand la page ne compte rien (réparations)", () => {
    expect(pickedMessage("iPhone", "A", undefined)).toBe("Ajouté au ticket : iPhone");
  });
});
