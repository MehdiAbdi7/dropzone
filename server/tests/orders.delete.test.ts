import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Supprimer une commande (15/11, lot 2) : le stock revient, l'argent encaissé est rendu par un
// mouvement négatif du jour, une trace reste (même sans la commande).
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const TODAY = "2026-11-14";
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function delivery(items = [{ sku: "IP-NEW-256", quantity: 1 }]) {
  const placed = await previewThenOrder(items);
  expect(placed.status).toBe(201);
  return prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number } });
}

async function paidPickup() {
  const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
    fulfillment: "pickup",
    pickupDate: TODAY,
    pickupTime: "15:00",
  });
  const admin = await loginAs("admin");
  await admin.agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  const order = await prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number } });
  await admin.agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" }).expect(200);
  return { order, admin };
}

describe("DELETE /admin/orders/:id", () => {
  it("supprime une livraison non payée : stock et cadeaux rendus, trace écrite, caisse non exigée", async () => {
    const stockPhone = await stockOf("IP-R-DEAL");
    const stockCharger = await stockOf("CHG-20W");
    const order = await delivery([{ sku: "IP-R-DEAL", quantity: 1 }]);
    expect(await stockOf("IP-R-DEAL")).toBe(stockPhone - 1);
    expect(await stockOf("CHG-20W")).toBe(stockCharger - 1);

    const { agent, user } = await loginAs("admin");
    const response = await agent.delete(`/admin/orders/${order.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ id: order.id, refunded: 0 });

    expect(await stockOf("IP-R-DEAL")).toBe(stockPhone);
    expect(await stockOf("CHG-20W")).toBe(stockCharger);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
    expect(await prisma.moneyMovement.count()).toBe(0);
    const [event] = await prisma.orderEvent.findMany();
    expect(event).toMatchObject({ kind: "deleted", orderId: order.id, orderNumber: order.number, userId: user.id });
    expect(event.summary).toContain("Amine Test");
    expect(event.summary).toContain(String(order.total).replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  });

  it("supprime un retrait payé en espèces : un mouvement négatif du jour rend l'argent", async () => {
    const { order, admin } = await paidPickup();
    const before = await stockOf("IP-NEW-256");
    const response = await admin.agent.delete(`/admin/orders/${order.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.refunded).toBe(245_000);
    expect(await stockOf("IP-NEW-256")).toBe(before + 1);

    const movements = await prisma.moneyMovement.findMany({ orderBy: { id: "asc" } });
    expect(movements.map((m) => [m.kind, m.method, m.amount])).toEqual([
      ["pickup", "cash", 245_000],
      ["correction", "cash", -245_000],
    ]);
    expect(movements[1].businessDate.toISOString().slice(0, 10)).toBe(TODAY);
    expect((await admin.agent.get("/admin/cash/today")).body.data.summary.cashIn).toBe(0);
    expect((await prisma.orderEvent.findFirstOrThrow()).amountDelta).toBe(-245_000);
  });

  it("ne remet pas en stock une commande déjà annulée", async () => {
    const order = await delivery();
    const { agent } = await loginAs("admin");
    await agent.patch(`/admin/orders/${order.id}/status`).send({ status: "cancelled" }).expect(200);
    const afterCancel = await stockOf("IP-NEW-256");
    expect((await agent.delete(`/admin/orders/${order.id}`)).status).toBe(200);
    expect(await stockOf("IP-NEW-256")).toBe(afterCancel);
  });

  it("refuse de rendre de l'argent quand la caisse du jour n'est pas ouverte, sans rien changer", async () => {
    const { order, admin } = await paidPickup();
    vi.setSystemTime(at("2026-11-15T10:00"));
    const stock = await stockOf("IP-NEW-256");
    const response = await admin.agent.delete(`/admin/orders/${order.id}`);
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Ouvrez la journée de caisse d'abord");
    expect(await prisma.order.count()).toBe(1);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
    expect(await prisma.moneyMovement.count({ where: { kind: "correction" } })).toBe(0);
    expect(await prisma.orderEvent.count()).toBe(0);
  });

  it("de deux suppressions simultanées, une seule passe : stock rendu une fois, un seul mouvement", async () => {
    const { order, admin } = await paidPickup();
    const before = await stockOf("IP-NEW-256");
    const responses = await Promise.all([
      admin.agent.delete(`/admin/orders/${order.id}`),
      admin.agent.delete(`/admin/orders/${order.id}`),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 404]);
    expect(await stockOf("IP-NEW-256")).toBe(before + 1);
    expect(await prisma.moneyMovement.count({ where: { kind: "correction" } })).toBe(1);
    expect(await prisma.orderEvent.count()).toBe(1);
  });

  it("répond 404 pour une commande inconnue", async () => {
    const { agent } = await loginAs("admin");
    expect((await agent.delete("/admin/orders/999999")).status).toBe(404);
  });
});
