import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Modifier une commande (15/11, lot 2) : le stock et l'argent suivent, une caisse fermée n'est
// jamais réécrite (la correction est une ligne du jour), une trace reste.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const TODAY = "2026-11-14";
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  await prisma.productVariant.update({ where: { sku: "CHG-20W" }, data: { purchasePrice: 1_000 } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function delivery(items = [{ sku: "IP-NEW-256", quantity: 1 }]) {
  const placed = await previewThenOrder(items);
  expect(placed.status).toBe(201);
  return prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number }, include: { items: true } });
}

// Un retrait réservé puis payé au comptoir : l'argent est dans le journal, la caisse du jour ouverte.
async function paidPickup(method: "cash" | "card" = "cash") {
  const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
    fulfillment: "pickup",
    pickupDate: TODAY,
    pickupTime: "15:00",
  });
  expect(placed.status).toBe(201);
  const admin = await loginAs("admin");
  await admin.agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  const order = await prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number }, include: { items: true } });
  await admin.agent.post(`/admin/orders/${order.id}/pickup`).send({ method }).expect(200);
  return { order, admin };
}

const lineOf = (order: { items: { id: number; unitPrice: number; quantity: number }[] }, over = {}) => ({
  id: order.items[0].id,
  quantity: order.items[0].quantity,
  unitPrice: order.items[0].unitPrice,
  ...over,
});

describe("PATCH /admin/orders/:id", () => {
  it("change une quantité : stock ajusté, total recalculé, frais et prix d'achat gardés, trace écrite", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const before = await stockOf("IP-NEW-256");
    // Le prix d'achat change après la vente : la ligne garde celui de la vente.
    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 210_000 } });

    const response = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { quantity: 2 })] });
    expect(response.status).toBe(200);

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);
    expect(updated.subtotal).toBe(490_000);
    expect(updated.shippingFee).toBe(order.shippingFee);
    expect(updated.total).toBe(490_000 + order.shippingFee);
    expect(updated.items[0]).toMatchObject({ quantity: 2, unitCost: 200_000 });
    expect(await prisma.moneyMovement.count()).toBe(0);

    const events = await prisma.orderEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "edited", orderId: order.id, orderNumber: order.number, amountDelta: 245_000 });
    expect(events[0].summary).toContain("Quantité de iPhone 15 Pro Max : 1 → 2");
  });

  it("baisse le prix d'un retrait payé : une correction négative du jour, jamais dans le passé", async () => {
    const { order, admin } = await paidPickup();
    const response = await admin.agent
      .patch(`/admin/orders/${order.id}`)
      .send({ lines: [lineOf(order, { unitPrice: 236_000 })] });
    expect(response.status).toBe(200);

    const movements = await prisma.moneyMovement.findMany({ orderBy: { id: "asc" } });
    expect(movements.map((m) => [m.kind, m.method, m.amount])).toEqual([
      ["pickup", "cash", 245_000],
      ["correction", "cash", -9_000],
    ]);
    expect(movements[1].businessDate.toISOString().slice(0, 10)).toBe(TODAY);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).total).toBe(236_000);
    const cash = await admin.agent.get("/admin/cash/today");
    expect(cash.body.data.summary.cashIn).toBe(236_000);
  });

  it("change le moyen de paiement d'un retrait payé : l'argent passe de l'un à l'autre", async () => {
    const { order, admin } = await paidPickup("cash");
    const response = await admin.agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order)], method: "card" });
    expect(response.status).toBe(200);
    const summary = (await admin.agent.get("/admin/cash/today")).body.data.summary;
    expect(summary.byMethod).toMatchObject({ cash: 0, card: 245_000 });
    expect(await prisma.moneyMovement.count({ where: { kind: "correction" } })).toBe(2);
    expect((await prisma.orderEvent.findFirstOrThrow()).summary).toContain("Moyen de paiement");
  });

  it("remplace un article : l'ancien revient en stock, le nouveau sort, son prix d'achat est celui du moment", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const stockPhone = await stockOf("IP-NEW-256");
    const stockCharger = await stockOf("CHG-20W");
    const response = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [{ sku: "CHG-20W", quantity: 2, unitPrice: 2_500 }] });
    expect(response.status).toBe(200);
    expect(await stockOf("IP-NEW-256")).toBe(stockPhone + 1);
    expect(await stockOf("CHG-20W")).toBe(stockCharger - 2);
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]).toMatchObject({ sku: "CHG-20W", quantity: 2, unitPrice: 2_500, unitCost: 1_000 });
    expect(updated.subtotal).toBe(5_000);
  });

  it("garde les cadeaux et n'accepte que le prix, le moyen et les coordonnées sur une commande qui en a", async () => {
    const order = await delivery([{ sku: "IP-R-DEAL", quantity: 1 }]);
    expect(order.items).toHaveLength(2);
    const { agent } = await loginAs("admin");
    const paying = order.items.find((item) => !item.isGift)!;

    const price = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf({ items: [paying] }, { unitPrice: 180_000 })], note: "Négocié" });
    expect(price.status).toBe(200);
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(updated.items.find((item) => item.isGift)).toMatchObject({ sku: "CHG-20W", quantity: 1, unitPrice: 0 });
    expect(updated.subtotal).toBe(180_000);
    expect(updated.note).toBe("Négocié");

    const quantity = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf({ items: [paying] }, { quantity: 1, id: paying.id, unitPrice: 180_000 }), { sku: "COQ-IP15PM", quantity: 1, unitPrice: 1_800 }] });
    expect(quantity.status).toBe(409);
    expect(quantity.body.error.message).toMatch(/cadeaux/);
  });

  it("refuse sans rien changer : stock insuffisant, commande annulée, ligne inconnue, commande inconnue", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const before = await stockOf("IP-NEW-256");

    const tooMany = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { quantity: 9 })] });
    expect(tooMany.status).toBe(409);
    expect(await stockOf("IP-NEW-256")).toBe(before);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).total).toBe(order.total);

    const unknownLine = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [{ id: 999_999, quantity: 1, unitPrice: 1 }] });
    expect(unknownLine.status).toBe(400);

    const unknownSku = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [{ sku: "NOPE", quantity: 1, unitPrice: 1 }] });
    expect(unknownSku.status).toBe(400);

    const noLines = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [] });
    expect(noLines.status).toBe(400);

    expect((await agent.patch("/admin/orders/999999").send({ lines: [lineOf(order)] })).status).toBe(404);

    await agent.patch(`/admin/orders/${order.id}/status`).send({ status: "cancelled" }).expect(200);
    const cancelled = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 1 })] });
    expect(cancelled.status).toBe(409);
    expect(await prisma.orderEvent.count()).toBe(0);
  });

  it("refuse un moyen de paiement sur une commande pas encore payée", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const response = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order)], method: "card" });
    expect(response.status).toBe(400);
  });

  it("refuse de corriger l'argent quand la caisse du jour n'est pas ouverte, sans rien changer", async () => {
    const { order, admin } = await paidPickup();
    // Le lendemain : la caisse du 14 est derrière, celle du 15 n'est pas ouverte.
    vi.setSystemTime(at("2026-11-15T10:00"));
    const stock = await stockOf("IP-NEW-256");
    const response = await admin.agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 200_000 })] });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Ouvrez la journée de caisse d'abord");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).total).toBe(245_000);
    expect(await prisma.moneyMovement.count({ where: { kind: "correction" } })).toBe(0);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
    expect(await prisma.orderEvent.count()).toBe(0);
  });

  it("de deux modifications simultanées, le stock n'est jamais ajusté en double", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const start = (await stockOf("IP-NEW-256")) + 1; // le stock avant la commande
    const responses = await Promise.all([
      agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { quantity: 2 })] }),
      agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { quantity: 3 })] }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(await stockOf("IP-NEW-256")).toBe(start - final.items[0].quantity);
    expect(final.subtotal).toBe(245_000 * final.items[0].quantity);
  });

  it("ne montre ni prix d'achat, ni mouvements, ni traces au client qui suit sa commande", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 240_000 })] }).expect(200);
    const tracked = await request(app).post("/orders/track").send({ number: order.number, phone: "0555123456" });
    expect(tracked.status).toBe(200);
    const text = JSON.stringify(tracked.body);
    for (const secret of ["unitCost", "payments", "events", "profit", "purchasePrice"]) {
      expect(text).not.toContain(secret);
    }
  });
});

describe("GET /admin/orders/:id", () => {
  it("donne ce qui est payé, les paiements, le bénéfice et les traces", async () => {
    const { order, admin } = await paidPickup();
    await admin.agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 236_000 })] }).expect(200);
    const response = await admin.agent.get(`/admin/orders/${order.id}`);
    expect(response.body.data.paid).toBe(236_000);
    expect(response.body.data.payments).toHaveLength(2);
    expect(response.body.data.profit).toBe(36_000);
    expect(response.body.data.events).toHaveLength(1);
  });

  it("dit « bénéfice inconnu » (null) quand un prix d'achat manque", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: null } });
    const order = await delivery();
    const { agent } = await loginAs("admin");
    expect((await agent.get(`/admin/orders/${order.id}`)).body.data.profit).toBeNull();
  });
});

// Les défauts trouvés à la relecture du lot 2 (15/11).
describe("après la relecture", () => {
  it("une annulation qui croise une modification ne fausse pas le stock", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const start = (await stockOf("IP-NEW-256")) + 1;
    // Deux admins en même temps : l'un annule, l'autre passe la quantité de 1 à 3.
    await Promise.all([
      agent.patch(`/admin/orders/${order.id}/status`).send({ status: "cancelled" }),
      agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { quantity: 3 })] }),
    ]);
    const final = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(final.status).toBe("cancelled");
    // Annulée : tout est rendu, quelle que soit la quantité que la modification ait eu le temps de poser.
    expect(await stockOf("IP-NEW-256")).toBe(start);
  });

  it("refuse de changer une commande expirée", async () => {
    const order = await delivery();
    await prisma.order.update({ where: { id: order.id }, data: { status: "expired" } });
    const { agent } = await loginAs("admin");
    const response = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 1 })] });
    expect(response.status).toBe(409);
  });

  it("une commande payée ramenée à 0 DA reste payée : la remettre au prix écrit la correction", async () => {
    const { order, admin } = await paidPickup();
    await admin.agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 0 })] }).expect(200);
    expect((await admin.agent.get(`/admin/orders/${order.id}`)).body.data.paid).toBe(0);

    await admin.agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 245_000 })] }).expect(200);
    const after = (await admin.agent.get(`/admin/orders/${order.id}`)).body.data;
    expect(after.paid).toBe(245_000);
    expect(after.total).toBe(245_000);
    expect((await admin.agent.get("/admin/cash/today")).body.data.summary.cashIn).toBe(245_000);
  });

  it("refuse de retirer un article puis de le rajouter par son SKU : son prix d'achat ne se réécrit pas", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const response = await agent
      .patch(`/admin/orders/${order.id}`)
      .send({ lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 100_000 }] });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/déjà dans la commande/);
    expect((await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id } })).unitCost).toBe(200_000);
  });

  it("refuse un total qui dépasse la limite d'un entier de la base, par une erreur claire", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    const big = { quantity: 10, unitPrice: 50_000_000 };
    const response = await agent.patch(`/admin/orders/${order.id}`).send({
      lines: [
        { id: order.items[0].id, ...big },
        { sku: "CHG-20W", ...big },
        { sku: "COQ-IP15PM", ...big },
        { sku: "IP-R-WIFI", ...big },
        { sku: "IP-R-SOLD", ...big },
      ],
    });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/trop élevé/);
  });

  it("refuse une quantité changée sur une commande avec cadeau, même sans nouvel article", async () => {
    const order = await delivery([{ sku: "IP-R-DEAL", quantity: 1 }]);
    const { agent } = await loginAs("admin");
    const paying = order.items.find((item) => !item.isGift)!;
    const response = await agent
      .patch(`/admin/orders/${order.id}`)
      .send({ lines: [{ id: paying.id, quantity: 2, unitPrice: paying.unitPrice }] });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/cadeaux/);
  });

  it("ne montre rien de secret dans l'espace du client connecté non plus", async () => {
    const buyer = await loginAs("customer");
    const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {}, buyer.agent);
    expect(placed.status).toBe(201);
    const admin = await loginAs("admin", "autre-admin@test.dz");
    const order = await prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number }, include: { items: true } });
    await admin.agent.patch(`/admin/orders/${order.id}`).send({ lines: [lineOf(order, { unitPrice: 240_000 })] }).expect(200);
    const mine = await buyer.agent.get(`/orders/mine/${order.number}`);
    expect(mine.status).toBe(200);
    for (const secret of ["unitCost", "payments", "events", "profit", "purchasePrice"]) {
      expect(JSON.stringify(mine.body)).not.toContain(secret);
    }
  });
});
