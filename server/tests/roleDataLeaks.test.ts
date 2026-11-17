import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Lot 7 : le vendeur et le responsable ne voient jamais ce que la marchandise a coûté au magasin, ni le
// bénéfice. Et un vendeur n'ouvre que la facture d'une vente du comptoir, jamais celle d'un client du site
// (nom, téléphone, adresse).
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const COST_KEYS = ["unitCost", "purchasePrice", "profit", "margin"];

// Toutes les clés de coût trouvées n'importe où dans une réponse.
function costKeysIn(value: unknown, found: Set<string> = new Set()): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => costKeysIn(item, found));
  } else if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      if (COST_KEYS.includes(key)) found.add(key);
      costKeysIn(inner, found);
    }
  }
  return [...found];
}

beforeEach(async () => {
  await resetDb();
  const catalog = await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
  return catalog;
});

afterEach(() => {
  vi.useRealTimers();
});

const sale = { fullName: "Amine Test", phone: "0555 12 34 56", method: "cash", lines: [{ sku: "IP-NEW-256", quantity: 1 }] };
const exchange = {
  ...sale,
  tradeIn: {
    deviceModelId: 0,
    color: "Titane naturel",
    price: 150_000,
    options: { Stockage: "256 Go" },
    grade: 8,
    batteryHealth: 88,
    replacedParts: [],
    compatibleParts: [],
    defects: [],
    limitations: [],
    withBox: false,
    details: "",
    warrantyMonths: 3,
    origin: "Europe",
  },
};

// Un comptoir ouvert par un vendeur, une vente et un échange qu'il a faits, une livraison d'un client du site.
async function shop() {
  const seller = await loginAs("seller", "vendeur@test.dz");
  const manager = await loginAs("order_manager", "responsable@test.dz");
  const admin = await loginAs("admin", "boss@test.dz");
  await seller.agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  const soldBySeller = await seller.agent.post("/admin/sales").send(sale).expect(201);
  const model = await prisma.deviceModel.findFirstOrThrow({ where: { slug: "apple-iphone-15-pro-max" } });
  const exchanged = await seller.agent
    .post("/admin/exchanges")
    .send({ ...exchange, tradeIn: { ...exchange.tradeIn, deviceModelId: model.id } })
    .expect(201);
  await previewThenOrder([{ sku: "CHG-20W", quantity: 1 }]);
  const delivery = await prisma.order.findFirstOrThrow({ where: { type: "delivery" } });
  return { seller, manager, admin, soldId: soldBySeller.body.data.id as number, exchangeId: exchanged.body.data.id as number, delivery, soldBySeller, exchanged };
}

describe("le détecteur de clés de coût", () => {
  it("trouve une clé à n'importe quelle profondeur", () => {
    expect(costKeysIn({ a: [{ b: { unitCost: 1 } }], c: { purchasePrice: 2 } }).sort()).toEqual(["purchasePrice", "unitCost"]);
    expect(costKeysIn({ a: [{ b: { price: 1 } }] })).toEqual([]);
  });
});

describe("l'admin garde ses coûts (rien ne change pour lui)", () => {
  it("le détail d'une vente montre toujours le prix d'achat figé", async () => {
    const { admin, soldId } = await shop();
    expect(costKeysIn((await admin.agent.get(`/admin/orders/${soldId}`).expect(200)).body)).toContain("unitCost");
  });
});

describe("aucune donnée de coût vers le vendeur", () => {
  it("ni dans la recherche de variantes, ni dans la vente, l'échange, la caisse ou la facture", async () => {
    const { seller, soldId, soldBySeller, exchanged } = await shop();
    const responses = [
      (await seller.agent.get("/admin/variants").expect(200)).body,
      soldBySeller.body,
      exchanged.body,
      (await seller.agent.get("/admin/cash/today").expect(200)).body,
      (await seller.agent.post(`/admin/orders/${soldId}/invoice`).expect(200)).body,
    ];
    responses.forEach((body, index) => expect(costKeysIn(body), `réponse n° ${index + 1}`).toEqual([]));
  });
});

describe("aucune donnée de coût vers le responsable commande", () => {
  it("ni dans la liste des commandes, ni dans le détail d'une commande", async () => {
    const { manager, soldId, exchangeId, delivery } = await shop();
    const list = (await manager.agent.get("/admin/orders").expect(200)).body;
    expect(costKeysIn(list)).toEqual([]);
    for (const id of [soldId, exchangeId, delivery.id]) {
      const detail = await manager.agent.get(`/admin/orders/${id}`).expect(200);
      expect(costKeysIn(detail.body), `commande ${id}`).toEqual([]);
    }
  });
});

describe("la facture d'un vendeur : le comptoir seulement", () => {
  it("refuse la commande en ligne d'un client sans consommer de numéro de facture", async () => {
    const { seller, delivery } = await shop();
    await prisma.order.update({ where: { id: delivery.id }, data: { status: "confirmed" } });
    const response = await seller.agent.post(`/admin/orders/${delivery.id}/invoice`);
    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain(delivery.fullName);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: delivery.id } });
    expect(after.invoiceNumber).toBeNull();
  });

  it("donne la facture d'une vente et d'un échange du comptoir", async () => {
    const { seller, soldId, exchangeId } = await shop();
    expect((await seller.agent.post(`/admin/orders/${soldId}/invoice`)).status).toBe(200);
    expect((await seller.agent.post(`/admin/orders/${exchangeId}/invoice`)).status).toBe(200);
  });

  it("le responsable ouvre aussi la facture d'une commande en ligne", async () => {
    const { manager, delivery } = await shop();
    await prisma.order.update({ where: { id: delivery.id }, data: { status: "confirmed" } });
    expect((await manager.agent.post(`/admin/orders/${delivery.id}/invoice`)).status).toBe(200);
  });
});

describe("l'auteur est gardé", () => {
  it("une vente et un échange faits par le vendeur écrivent son compte dans le journal de l'argent", async () => {
    const { seller, soldId, exchangeId } = await shop();
    const movements = await prisma.moneyMovement.findMany({ where: { orderId: { in: [soldId, exchangeId] } } });
    expect(movements).toHaveLength(2);
    expect(movements.every((movement) => movement.userId === seller.user.id)).toBe(true);
  });
});
