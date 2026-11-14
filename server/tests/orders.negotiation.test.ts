import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { negotiateOrderPrices } from "../src/modules/orders/negotiation.service.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Négocier le prix avant de valider un retrait ou de confirmer une livraison (16/11, lot 3).
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const TODAY = "2026-11-16";

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function placed(extra: Record<string, unknown> = {}, items = [{ sku: "IP-NEW-256", quantity: 1 }]) {
  const response = await previewThenOrder(items, extra);
  expect(response.status).toBe(201);
  return prisma.order.findUniqueOrThrow({ where: { number: response.body.data.number }, include: { items: true } });
}
const pickupOrder = () => placed({ fulfillment: "pickup", pickupDate: TODAY, pickupTime: "15:00" });

async function openCounter() {
  const admin = await loginAs("admin");
  await admin.agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  return admin;
}

describe("valider un retrait avec un prix négocié", () => {
  it("encaisse le nouveau total, garde le prix catalogue et l'auteur, écrit une trace", async () => {
    const order = await pickupOrder();
    const { agent, user } = await openCounter();
    const response = await agent
      .post(`/admin/orders/${order.id}/pickup`)
      .send({ method: "cash", prices: [{ id: order.items[0].id, unitPrice: 240_000 }] });
    expect(response.status).toBe(200);

    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(after).toMatchObject({ status: "picked_up", subtotal: 240_000, total: 240_000 });
    expect(after.items[0]).toMatchObject({ unitPrice: 240_000, listPrice: 245_000, grantedById: user.id });
    const movement = await prisma.moneyMovement.findFirstOrThrow();
    expect(movement).toMatchObject({ kind: "pickup", amount: 240_000, method: "cash", orderId: order.id });
    expect((await agent.get("/admin/cash/today")).body.data.summary.cashIn).toBe(240_000);
    const event = await prisma.orderEvent.findFirstOrThrow();
    expect(event.summary).toContain("Prix négocié");
    expect(event.summary).toContain("245 000 → 240 000 DA");
    expect(event.amountDelta).toBe(-5_000);
  });

  it("encaisse le prix du site quand on ne négocie rien", async () => {
    const order = await pickupOrder();
    const { agent } = await openCounter();
    await agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" }).expect(200);
    expect((await prisma.moneyMovement.findFirstOrThrow()).amount).toBe(245_000);
    expect(await prisma.orderEvent.count()).toBe(0);
  });

  it("n'a rien changé du tout quand la validation échoue (caisse fermée)", async () => {
    const order = await pickupOrder();
    const { agent } = await loginAs("admin");
    const response = await agent
      .post(`/admin/orders/${order.id}/pickup`)
      .send({ method: "cash", prices: [{ id: order.items[0].id, unitPrice: 1 }] });
    expect(response.status).toBe(409);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(after.total).toBe(245_000);
    expect(after.items[0]).toMatchObject({ unitPrice: 245_000, grantedById: null });
    expect(await prisma.orderEvent.count()).toBe(0);
  });
});

describe("confirmer une livraison avec un prix négocié", () => {
  it("met le total à jour, garde les frais de livraison et passe à « confirmée »", async () => {
    const order = await placed();
    const { agent } = await loginAs("admin");
    const response = await agent
      .patch(`/admin/orders/${order.id}/status`)
      .send({ status: "confirmed", prices: [{ id: order.items[0].id, unitPrice: 240_000 }] });
    expect(response.status).toBe(200);
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(after.status).toBe("confirmed");
    expect(after.subtotal).toBe(240_000);
    expect(after.shippingFee).toBe(order.shippingFee);
    expect(after.total).toBe(240_000 + order.shippingFee);
    expect(after.items[0].listPrice).toBe(245_000);
    expect(await prisma.moneyMovement.count()).toBe(0);
  });

  it("refuse des prix envoyés avec un autre statut que « confirmée »", async () => {
    const order = await placed();
    const { agent } = await loginAs("admin");
    const response = await agent
      .patch(`/admin/orders/${order.id}/status`)
      .send({ status: "cancelled", prices: [{ id: order.items[0].id, unitPrice: 1 }] });
    expect(response.status).toBe(400);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("pending");
  });
});

describe("prix refusés", () => {
  const send = async (order: Awaited<ReturnType<typeof placed>>, prices: unknown) => {
    const { agent } = await loginAs("admin", `admin${Math.random()}@test.dz`);
    return agent.patch(`/admin/orders/${order.id}/status`).send({ status: "confirmed", prices });
  };

  it("refuse un prix négatif, non entier ou trop grand, un cadeau, une ligne qui n'est pas de la commande", async () => {
    const order = await placed({}, [{ sku: "IP-R-DEAL", quantity: 1 }]);
    const paying = order.items.find((item) => !item.isGift)!;
    const gift = order.items.find((item) => item.isGift)!;
    for (const [label, prices, pattern] of [
      ["négatif", [{ id: paying.id, unitPrice: -1 }], undefined],
      ["non entier", [{ id: paying.id, unitPrice: 10.5 }], undefined],
      ["trop grand", [{ id: paying.id, unitPrice: 10_000_001 }], undefined],
      ["cadeau", [{ id: gift.id, unitPrice: 100 }], /cadeau/],
      ["ligne étrangère", [{ id: 999_999, unitPrice: 100 }], undefined],
    ] as [string, unknown, RegExp | undefined][]) {
      const response = await send(order, prices);
      expect(response.status, label).toBe(400);
      if (pattern) expect(response.body.error.message).toMatch(pattern);
    }
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
    expect(after.status).toBe("pending");
    expect(after.total).toBe(order.total);
  });
});

describe("negotiateOrderPrices", () => {
  const negotiate = (orderId: number, itemId: number) =>
    prisma.$transaction((tx) => negotiateOrderPrices(tx, orderId, [{ id: itemId, unitPrice: 100 }], 1));

  it("refuse une commande annulée, expirée ou déjà payée", async () => {
    const cancelled = await placed();
    await prisma.order.update({ where: { id: cancelled.id }, data: { status: "cancelled" } });
    await expect(negotiate(cancelled.id, cancelled.items[0].id)).rejects.toMatchObject({ statusCode: 409 });

    const expired = await placed();
    await prisma.order.update({ where: { id: expired.id }, data: { status: "expired" } });
    await expect(negotiate(expired.id, expired.items[0].id)).rejects.toMatchObject({ statusCode: 409 });

    const paid = await placed();
    await prisma.moneyMovement.create({
      data: { orderId: paid.id, businessDate: new Date(`${TODAY}T00:00:00Z`), amount: paid.total, method: "cash", kind: "delivery" },
    });
    await expect(negotiate(paid.id, paid.items[0].id)).rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: paid.id } })).total).toBe(paid.total);
  });

  it("répond 404 pour une commande inconnue", async () => {
    await expect(negotiate(999_999, 1)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("la réduction dans la lecture du back-office", () => {
  it("donne le prix catalogue, qui a accordé le prix et la réduction ; rien de tout cela au client", async () => {
    const order = await placed();
    const { agent } = await loginAs("admin");
    await agent
      .patch(`/admin/orders/${order.id}/status`)
      .send({ status: "confirmed", prices: [{ id: order.items[0].id, unitPrice: 240_000 }] })
      .expect(200);

    const read = (await agent.get(`/admin/orders/${order.id}`)).body.data;
    expect(read.discount).toBe(5_000);
    expect(read.items[0]).toMatchObject({ unitPrice: 240_000, listPrice: 245_000, grantedByName: "Amine Test" });

    const tracked = await request(app).post("/orders/track").send({ number: order.number, phone: "0555123456" });
    for (const secret of ["listPrice", "grantedBy", "discount"]) {
      expect(JSON.stringify(tracked.body)).not.toContain(secret);
    }
  });

  it("n'invente pas de réduction pour une commande d'avant le lot 3", async () => {
    const order = await placed();
    await prisma.orderItem.updateMany({ where: { orderId: order.id }, data: { listPrice: null } });
    const { agent } = await loginAs("admin");
    const read = (await agent.get(`/admin/orders/${order.id}`)).body.data;
    expect(read.discount).toBe(0);
    expect(read.items[0].grantedByName).toBeNull();
  });
});

describe("modifier une commande garde le prix catalogue", () => {
  it("change le prix d'une ligne : prix catalogue et auteur ; un article ajouté prend son prix catalogue", async () => {
    const order = await placed();
    const { agent, user } = await loginAs("admin");
    await agent
      .patch(`/admin/orders/${order.id}`)
      .send({
        lines: [
          { id: order.items[0].id, quantity: 1, unitPrice: 240_000 },
          { sku: "COQ-IP15PM", quantity: 1, unitPrice: 1_800 },
        ],
      })
      .expect(200);
    const items = await prisma.orderItem.findMany({ where: { orderId: order.id }, orderBy: { id: "asc" } });
    expect(items[0]).toMatchObject({ unitPrice: 240_000, listPrice: 245_000, grantedById: user.id });
    expect(items[1]).toMatchObject({ sku: "COQ-IP15PM", unitPrice: 1_800, listPrice: 1_800, grantedById: null });
  });
});
