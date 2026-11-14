import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { resetOrders } from "../src/scripts/lib/resetOrders.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// La remise à zéro des commandes et de l'historique (demande de Mehdi : « quand je finis les tests,
// un script qui efface tout ça »). Efface commandes, argent, caisses et numéros du jour ; rend le
// stock des commandes dont les articles sont encore sortis ; ne touche ni au catalogue ni aux comptes.
const stockOf = async () => (await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-NEW-256" } })).stock;
let agent: Awaited<ReturnType<typeof loginAs>>["agent"];
let initialStock: number;

async function place() {
  const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
  expect(placed.status).toBe(201);
  return prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number } });
}
const advance = async (id: number, states: string[]) => {
  for (const status of states) await agent.patch(`/admin/orders/${id}/status`).send({ status }).expect(200);
};

// Une journée de tests typique : une commande en attente, une annulée, une encaissée, une supprimée,
// une caisse ouverte (donc des mouvements, des traces et des compteurs de jour).
beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { stock: 20 } });
  initialStock = await stockOf();
  ({ agent } = await loginAs("admin"));
  await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);

  await place();
  const cancelled = await place();
  await advance(cancelled.id, ["cancelled"]);
  const collected = await place();
  await advance(collected.id, ["confirmed", "shipped", "delivered"]);
  await agent.post(`/admin/orders/${collected.id}/collect`).send({ method: "cash" }).expect(200);
  const deleted = await place();
  await agent.delete(`/admin/orders/${deleted.id}`).expect(200);
});

describe("resetOrders", () => {
  it("efface les commandes, l'argent, les caisses, les traces et les numéros du jour", async () => {
    expect(await prisma.order.count()).toBeGreaterThan(0);
    expect(await prisma.moneyMovement.count()).toBeGreaterThan(0);
    expect(await prisma.cashDay.count()).toBeGreaterThan(0);
    expect(await prisma.orderEvent.count()).toBeGreaterThan(0);
    expect(await prisma.dailyCounter.count()).toBeGreaterThan(0);

    const report = await resetOrders(prisma, { keepStock: false });

    expect(report.orders).toBe(3);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
    expect(await prisma.moneyMovement.count()).toBe(0);
    expect(await prisma.orderEvent.count()).toBe(0);
    expect(await prisma.cashDay.count()).toBe(0);
    expect(await prisma.cashReopening.count()).toBe(0);
    expect(await prisma.dailyCounter.count()).toBe(0);
  });

  it("rend le stock des commandes dont les articles sont encore sortis, une seule fois", async () => {
    // En attente et encaissée : 2 appareils sortis. L'annulée et la supprimée l'ont déjà rendu.
    expect(await stockOf()).toBe(initialStock - 2);
    const report = await resetOrders(prisma, { keepStock: false });
    expect(report.restockedUnits).toBe(2);
    expect(await stockOf()).toBe(initialStock);
  });

  it("garde le stock tel quel avec keepStock", async () => {
    const report = await resetOrders(prisma, { keepStock: true });
    expect(report.restockedUnits).toBe(0);
    expect(await stockOf()).toBe(initialStock - 2);
    expect(await prisma.order.count()).toBe(0);
  });

  it("ne touche ni au catalogue, ni aux comptes, ni aux horaires du magasin", async () => {
    const before = {
      products: await prisma.product.count(),
      variants: await prisma.productVariant.count(),
      users: await prisma.user.count(),
      hours: await prisma.storeSettings.count(),
    };
    await resetOrders(prisma, { keepStock: false });
    expect({
      products: await prisma.product.count(),
      variants: await prisma.productVariant.count(),
      users: await prisma.user.count(),
      hours: await prisma.storeSettings.count(),
    }).toEqual(before);
  });

  it("ne change rien au deuxième passage", async () => {
    await resetOrders(prisma, { keepStock: false });
    expect(await resetOrders(prisma, { keepStock: false })).toEqual({
      orders: 0,
      movements: 0,
      events: 0,
      cashDays: 0,
      restockedUnits: 0,
    });
  });
});
