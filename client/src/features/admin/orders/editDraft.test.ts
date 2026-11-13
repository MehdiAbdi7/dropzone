import { describe, expect, it } from "vitest";
import { buildEditBody, currentMethod, draftFromItems, draftProblem, draftTotal } from "./editDraft";

// Le brouillon de la fenêtre « Modifier la commande » (15/11) : ce qui s'affiche et ce qui part.
const items = [
  { id: 11, sku: "IP-NEW-256", name: "iPhone 15 Pro Max", quantity: 1, unitPrice: 245_000, isGift: false },
  { id: 12, sku: "CHG-20W", name: "Chargeur 20 W", quantity: 1, unitPrice: 0, isGift: true },
];

describe("draftFromItems", () => {
  it("ne garde que les lignes payantes : les cadeaux ne se modifient pas", () => {
    const lines = draftFromItems(items);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ id: 11, name: "iPhone 15 Pro Max", quantity: 1, unitPrice: 245_000 });
  });
});

describe("draftTotal", () => {
  it("additionne les lignes et les frais de livraison", () => {
    const lines = [
      { key: "a", id: 11, name: "A", quantity: 2, unitPrice: 1_000 },
      { key: "b", sku: "B", name: "B", quantity: 1, unitPrice: 500 },
    ];
    expect(draftTotal(lines, 600)).toBe(3_100);
    expect(draftTotal(lines, 0)).toBe(2_500);
  });
});

describe("draftProblem", () => {
  const line = { key: "a", id: 11, name: "A", quantity: 1, unitPrice: 1_000 };
  it("accepte un brouillon correct", () => {
    expect(draftProblem([line])).toBeNull();
  });
  it("refuse une commande sans article", () => {
    expect(draftProblem([])).toMatch(/au moins un article/);
  });
  it("refuse une quantité hors de 1 à 10 ou un prix négatif ou non entier", () => {
    expect(draftProblem([{ ...line, quantity: 0 }])).toMatch(/quantité/i);
    expect(draftProblem([{ ...line, quantity: 11 }])).toMatch(/quantité/i);
    expect(draftProblem([{ ...line, unitPrice: -1 }])).toMatch(/prix/i);
    expect(draftProblem([{ ...line, unitPrice: 10.5 }])).toMatch(/prix/i);
  });
});

describe("buildEditBody", () => {
  const base = { fullName: "Amine Test", phone: "0555123456", note: "" };

  it("désigne une ligne existante par son id et un nouvel article par son SKU", () => {
    const body = buildEditBody({
      ...base,
      paid: false,
      lines: [
        { key: "a", id: 11, name: "A", quantity: 2, unitPrice: 240_000 },
        { key: "b", sku: "COQ-IP15PM", name: "Coque", quantity: 1, unitPrice: 1_800 },
      ],
    });
    expect(body.lines).toEqual([
      { id: 11, quantity: 2, unitPrice: 240_000 },
      { sku: "COQ-IP15PM", quantity: 1, unitPrice: 1_800 },
    ]);
  });

  it("n'envoie le moyen de paiement que pour une commande payée", () => {
    const lines = [{ key: "a", id: 11, name: "A", quantity: 1, unitPrice: 1 }];
    expect(buildEditBody({ ...base, lines, paid: false, method: "card" })).not.toHaveProperty("method");
    expect(buildEditBody({ ...base, lines, paid: true, method: "card" })).toMatchObject({ method: "card" });
  });

  it("envoie une remarque vide comme null, pour l'effacer", () => {
    const lines = [{ key: "a", id: 11, name: "A", quantity: 1, unitPrice: 1 }];
    expect(buildEditBody({ ...base, lines, paid: false }).note).toBeNull();
    expect(buildEditBody({ ...base, lines, paid: false, note: " Négocié " }).note).toBe("Négocié");
  });
});

describe("currentMethod", () => {
  it("prend le moyen qui porte le plus d'argent, corrections comprises", () => {
    expect(currentMethod([{ method: "cash", amount: 100_000 }, { method: "ccp", amount: 50_000 }])).toBe("cash");
    expect(currentMethod([{ method: "cash", amount: 100_000 }, { method: "cash", amount: -100_000 }, { method: "card", amount: 100_000 }])).toBe("card");
  });
  it("propose Espèces quand rien n'est payé", () => {
    expect(currentMethod([])).toBe("cash");
  });
});
