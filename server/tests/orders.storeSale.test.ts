import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// La vente au magasin (16/11, lot 3) : saisie au comptoir, encaissée dans la caisse du jour.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// Un vendeur connecté, caisse ouverte.
async function counter() {
  const admin = await loginAs("admin");
  await admin.agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  return admin;
}

const sale = (over: Record<string, unknown> = {}) => ({
  fullName: "Amine Test",
  phone: "0555 12 34 56",
  method: "cash",
  lines: [{ sku: "IP-NEW-256", quantity: 1 }],
  ...over,
});

describe("POST /admin/sales", () => {
  it("encaisse une vente en espèces : commande du magasin, stock, journal, prix d'achat copié", async () => {
    const { agent, user } = await counter();
    const before = await stockOf("IP-NEW-256");
    const response = await agent.post("/admin/sales").send(sale());
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ dailyNumber: 1, total: 245_000, status: "picked_up" });

    const order = await prisma.order.findFirstOrThrow({ include: { items: true } });
    expect(order).toMatchObject({
      type: "in_store",
      status: "picked_up",
      fullName: "Amine Test",
      phone: "0555123456",
      shippingFee: 0,
      subtotal: 245_000,
      total: 245_000,
      wilaya: null,
      address: null,
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({ unitPrice: 245_000, listPrice: 245_000, grantedById: null, unitCost: 200_000 });
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);

    const movements = await prisma.moneyMovement.findMany();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ kind: "sale", method: "cash", amount: 245_000, orderId: order.id, userId: user.id });
    expect(movements[0].businessDate.toISOString().slice(0, 10)).toBe("2026-11-16");
    expect((await agent.get("/admin/cash/today")).body.data.summary.cashIn).toBe(245_000);
  });

  it("garde le prix catalogue et dit qui a accordé un prix négocié", async () => {
    const { agent, user } = await counter();
    const response = await agent.post("/admin/sales").send(sale({ method: "card", lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 240_000 }] }));
    expect(response.status).toBe(201);
    const item = await prisma.orderItem.findFirstOrThrow();
    expect(item).toMatchObject({ unitPrice: 240_000, listPrice: 245_000, grantedById: user.id });
    const movement = await prisma.moneyMovement.findFirstOrThrow();
    expect(movement).toMatchObject({ amount: 240_000, method: "card" });
  });

  it("ajoute le cadeau d'une affaire à 0 DA et fait baisser son stock", async () => {
    const { agent } = await counter();
    const charger = await stockOf("CHG-20W");
    const response = await agent.post("/admin/sales").send(sale({ lines: [{ sku: "IP-R-DEAL", quantity: 1 }] }));
    expect(response.status).toBe(201);
    const items = await prisma.orderItem.findMany({ orderBy: { id: "asc" } });
    expect(items.map((item) => [item.sku, item.unitPrice, item.isGift])).toEqual([
      ["IP-R-DEAL", 185_000, false],
      ["CHG-20W", 0, true],
    ]);
    expect(items[1].listPrice).toBeNull();
    expect(await stockOf("CHG-20W")).toBe(charger - 1);
    expect(response.body.data.total).toBe(185_000);
  });

  it("exige que le client accepte les limitations d'un reconditionné", async () => {
    const { agent } = await counter();
    const refused = await agent.post("/admin/sales").send(sale({ lines: [{ sku: "IP-R-WIFI", quantity: 1 }] }));
    expect(refused.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf("IP-R-WIFI")).toBe(1);

    const accepted = await agent.post("/admin/sales").send(sale({ acceptLimitations: true, lines: [{ sku: "IP-R-WIFI", quantity: 1 }] }));
    expect(accepted.status).toBe(201);
    expect((await prisma.order.findFirstOrThrow()).limitationsAccepted).toBe(true);
  });

  it("refuse sans rien changer : nom, téléphone, moyen de paiement, panier, article, stock, prix", async () => {
    const { agent } = await counter();
    const stock = await stockOf("IP-NEW-256");
    const bad: [string, Record<string, unknown>, number][] = [
      ["nom trop court", { fullName: "Al" }, 400],
      ["téléphone invalide", { phone: "123" }, 400],
      ["moyen de paiement absent", { method: undefined }, 400],
      ["moyen de paiement inconnu", { method: "cheque" }, 400],
      ["panier vide", { lines: [] }, 400],
      ["SKU inconnu", { lines: [{ sku: "NOPE-1", quantity: 1 }] }, 409],
      ["brouillon", { lines: [{ sku: "ZFLIP6", quantity: 1 }] }, 409],
      ["stock insuffisant", { lines: [{ sku: "IP-NEW-256", quantity: 9 }] }, 409],
      ["prix négatif", { lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: -1 }] }, 400],
      ["prix non entier", { lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 10.5 }] }, 400],
      ["prix trop grand", { lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 10_000_001 }] }, 400],
    ];
    for (const [label, over, status] of bad) {
      const response = await agent.post("/admin/sales").send(sale(over));
      expect(response.status, label).toBe(status);
    }
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.moneyMovement.count()).toBe(0);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
  });

  it("refuse quand la caisse du jour n'est pas ouverte ou est fermée, sans rien changer", async () => {
    const { agent } = await loginAs("admin");
    const stock = await stockOf("IP-NEW-256");
    const closed = await agent.post("/admin/sales").send(sale());
    expect(closed.status).toBe(409);
    expect(closed.body.error.message).toBe("Ouvrez la journée de caisse d'abord");

    await agent.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    await agent.post("/admin/cash/close").send({ countedCash: 0 }).expect(200);
    const afterClose = await agent.post("/admin/sales").send(sale());
    expect(afterClose.status).toBe(409);
    expect(afterClose.body.error.message).toBe("La journée de caisse est fermée");
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.moneyMovement.count()).toBe(0);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
  });

  it("dit qu'un cadeau épuisé n'est pas offert, au lieu de le faire disparaître sans rien dire", async () => {
    const { agent } = await counter();
    await prisma.productVariant.update({ where: { sku: "CHG-20W" }, data: { stock: 0 } });
    const response = await agent.post("/admin/sales").send(sale({ lines: [{ sku: "IP-R-DEAL", quantity: 1 }] }));
    expect(response.status).toBe(201);
    expect(response.body.data.notices).toHaveLength(1);
    expect(response.body.data.notices[0]).toMatch(/Chargeur USB-C 20 W.*épuisé/);
    expect(await prisma.orderItem.count({ where: { isGift: true } })).toBe(0);
  });

  it("répond sans mise en garde quand tout est offert", async () => {
    const { agent } = await counter();
    const response = await agent.post("/admin/sales").send(sale());
    expect(response.body.data.notices).toEqual([]);
  });

  it("refuse deux prix différents pour le même article du ticket", async () => {
    const { agent } = await counter();
    const response = await agent.post("/admin/sales").send(
      sale({
        lines: [
          { sku: "IP-NEW-256", quantity: 1, unitPrice: 240_000 },
          { sku: "IP-NEW-256", quantity: 1, unitPrice: 230_000 },
        ],
      }),
    );
    expect(response.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuse un total qui dépasse la limite d'un entier de la base, par une erreur claire", async () => {
    const { agent } = await counter();
    const accessories = await prisma.category.findFirstOrThrow({ where: { slug: "accessoires" } });
    // 25 articles à 10 exemplaires et 10 000 000 DA : 2,5 milliards, au-delà de 2 milliards.
    await prisma.product.create({
      data: {
        name: "Lot de test",
        slug: "lot-de-test",
        description: "Test",
        categoryId: accessories.id,
        status: "published",
        variants: { create: Array.from({ length: 25 }, (_, index) => ({ sku: `BULK-${index}`, price: 1_000, stock: 10 })) },
      },
    });
    const lines = Array.from({ length: 25 }, (_, index) => ({ sku: `BULK-${index}`, quantity: 10, unitPrice: 10_000_000 }));
    const response = await agent.post("/admin/sales").send(sale({ lines }));
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/trop élevé/);
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf("BULK-0")).toBe(10);
  });

  it("de deux ventes simultanées du dernier exemplaire, une seule passe", async () => {
    const { agent } = await counter();
    const lines = [{ sku: "IP-R-WIFI", quantity: 1 }];
    const responses = await Promise.all([
      agent.post("/admin/sales").send(sale({ acceptLimitations: true, lines })),
      agent.post("/admin/sales").send(sale({ acceptLimitations: true, lines })),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockOf("IP-R-WIFI")).toBe(0);
    expect(await prisma.moneyMovement.count()).toBe(1);
    expect(await prisma.order.count()).toBe(1);
  });

  it("apparaît dans les ventes du jour de l'accueil et dans l'historique", async () => {
    const { agent } = await counter();
    await agent.post("/admin/sales").send(sale({ method: "baridimob" })).expect(201);
    const stats = (await agent.get("/admin/stats")).body.data;
    expect(stats).toMatchObject({ revenueToday: 245_000, ordersToday: 1 });
    const history = (await agent.get("/admin/history?from=2026-11-16&to=2026-11-16")).body.data;
    expect(history.totals).toMatchObject({ collected: 245_000, salesCount: 1, profit: 45_000 });
    expect(history.totals.byKind.sale).toBe(245_000);
    expect(history.totals.byMethod.baridimob).toBe(245_000);
  });

  it("est réservée à l'admin", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.post("/admin/sales").send(sale())).status).toBe(403);
  });
});

describe("une commande du site", () => {
  it("garde son prix catalogue sur chaque ligne payante, pas sur les cadeaux", async () => {
    const placed = await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);
    expect(placed.status).toBe(201);
    const items = await prisma.orderItem.findMany({ orderBy: { id: "asc" } });
    expect(items.map((item) => [item.sku, item.listPrice])).toEqual([
      ["IP-R-DEAL", 185_000],
      ["CHG-20W", null],
    ]);
  });
});
