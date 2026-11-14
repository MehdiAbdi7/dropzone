import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Lot 4 du back-office magasin (17/11) : les livraisons. Une livraison passe En préparation,
// Expédiée, Livrée, puis « Encaissée » (l'argent est arrivé : mouvement du journal à ce jour-là,
// HORS caisse) ou « Retournée » (colis refusé : stock remis, rien d'encaissé).
const at = (algiers: string) => new Date(`${algiers}+01:00`);
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

async function placeDelivery(sku = "IP-NEW-256") {
  const placed = await previewThenOrder([{ sku, quantity: 1 }]);
  expect(placed.status).toBe(201);
  return prisma.order.findUniqueOrThrow({ where: { number: placed.body.data.number } });
}

// Fait avancer une livraison jusqu'à un état, par les vraies routes.
async function advance(agent: Awaited<ReturnType<typeof loginAs>>["agent"], id: number, states: string[]) {
  for (const status of states) {
    await agent.patch(`/admin/orders/${id}/status`).send({ status }).expect(200);
  }
}

describe("états d'une livraison", () => {
  it("Retournée (colis refusé) depuis Expédiée ou Livrée : stock remis, rien d'encaissé", async () => {
    const stock = await stockOf("IP-NEW-256");
    const { agent } = await loginAs("admin");
    const first = await placeDelivery();
    await advance(agent, first.id, ["confirmed", "shipped", "returned"]);
    expect(await stockOf("IP-NEW-256")).toBe(stock);

    const second = await placeDelivery();
    await advance(agent, second.id, ["confirmed", "shipped", "delivered", "returned"]);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
    expect(await prisma.moneyMovement.count()).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: second.id } })).status).toBe("returned");
  });

  it("une livraison retournée ou encaissée ne bouge plus", async () => {
    const { agent } = await loginAs("admin");
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "returned"]);
    for (const status of ["delivered", "cancelled", "confirmed"]) {
      expect((await agent.patch(`/admin/orders/${order.id}/status`).send({ status })).status, status).toBe(409);
    }
    expect((await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" })).status).toBe(409);
  });

  it("« Encaissée » ne s'obtient pas par un simple changement d'état : il faut le moyen de paiement", async () => {
    const { agent } = await loginAs("admin");
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "delivered"]);
    const response = await agent.patch(`/admin/orders/${order.id}/status`).send({ status: "collected" });
    expect(response.status).toBe(409);
    expect(await prisma.moneyMovement.count()).toBe(0);
  });
});

describe("POST /admin/orders/:id/collect", () => {
  it("encaisse une livraison livrée : un mouvement du jour d'encaissement, hors caisse, sans caisse ouverte", async () => {
    const { agent, user } = await loginAs("admin");
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "delivered"]);

    // Encaissée le lendemain de la commande : l'argent compte ce jour-là.
    vi.setSystemTime(at("2026-11-15T11:00"));
    const response = await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "ccp" });
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("collected");

    const [movement] = await prisma.moneyMovement.findMany();
    expect(movement).toMatchObject({
      kind: "delivery",
      orderType: "delivery",
      method: "ccp",
      amount: order.total,
      orderId: order.id,
      userId: user.id,
    });
    expect(movement?.businessDate.toISOString().slice(0, 10)).toBe("2026-11-15");
  });

  it("n'entre jamais dans la caisse : ni tiroir, ni mouvements du jour, mais une ligne à part", async () => {
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "delivered"]);
    await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" }).expect(200);

    const today = (await agent.get("/admin/cash/today")).body.data;
    expect(today.movements).toEqual([]);
    expect(today.summary).toMatchObject({ cashIn: 0, expectedCash: 10_000, total: 0 });
    expect(today.deliveriesCollected).toBe(order.total);

    // La caisse se ferme sur son seul tiroir : 10 000 compté, aucun écart.
    const closed = await agent.post("/admin/cash/close").send({ countedCash: 10_000 });
    expect(closed.body.data.summary).toMatchObject({ gap: 0 });
  });

  it("refuse une deuxième fois, une livraison pas encore livrée, et un retrait", async () => {
    const { agent } = await loginAs("admin");
    const order = await placeDelivery();
    expect((await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" })).status).toBe(409);
    await advance(agent, order.id, ["confirmed", "shipped", "delivered"]);
    await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" }).expect(200);
    expect((await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" })).status).toBe(409);
    expect(await prisma.moneyMovement.count()).toBe(1);

    const pickup = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
      fulfillment: "pickup",
      pickupDate: "2026-11-14",
      pickupTime: "15:00",
    });
    const pickupOrder = await prisma.order.findUniqueOrThrow({ where: { number: pickup.body.data.number } });
    expect((await agent.post(`/admin/orders/${pickupOrder.id}/collect`).send({ method: "cash" })).status).toBe(409);
  });

  it("deux encaissements simultanés : un seul passe", async () => {
    const { agent } = await loginAs("admin");
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "delivered"]);
    const results = await Promise.all([
      agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" }),
      agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.moneyMovement.count()).toBe(1);
  });

  it("est réservé à l'admin et refuse un moyen inconnu", async () => {
    const customer = await loginAs("customer");
    expect((await customer.agent.post("/admin/orders/1/collect").send({ method: "cash" })).status).toBe(403);
    const { agent } = await loginAs("admin");
    expect((await agent.post("/admin/orders/1/collect").send({ method: "or" })).status).toBe(400);
  });
});

describe("supprimer une livraison encaissée", () => {
  it("rend l'argent hors caisse (sans caisse ouverte) et remet le stock", async () => {
    const stock = await stockOf("IP-NEW-256");
    const { agent } = await loginAs("admin");
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "delivered"]);
    await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" }).expect(200);

    const deleted = await agent.delete(`/admin/orders/${order.id}`);
    expect(deleted.status).toBe(200);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
    const movements = await prisma.moneyMovement.findMany({ orderBy: { id: "asc" } });
    expect(movements.map((m) => [m.kind, m.orderType, m.amount])).toEqual([
      ["delivery", "delivery", order.total],
      ["correction", "delivery", -order.total],
    ]);
  });
});

describe("une livraison retournée a déjà rendu son stock", () => {
  it("la supprimer ne le rend pas une deuxième fois, et on ne peut plus la modifier", async () => {
    const stock = await stockOf("IP-NEW-256");
    const { agent } = await loginAs("admin");
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "returned"]);
    expect(await stockOf("IP-NEW-256")).toBe(stock);

    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: order.id, isGift: false } });
    const edit = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [{ id: item.id, quantity: 2, unitPrice: item.unitPrice }] });
    expect(edit.status).toBe(409);
    expect(await stockOf("IP-NEW-256")).toBe(stock);

    expect((await agent.delete(`/admin/orders/${order.id}`)).status).toBe(200);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
  });
});

describe("GET /admin/deliveries/summary", () => {
  it("compte ce qui est en cours, à encaisser, encaissé par jour, retourné", async () => {
    const { agent } = await loginAs("admin");
    const inProgress = await placeDelivery("CHG-20W");
    await advance(agent, inProgress.id, ["confirmed"]);
    const toCollect = await placeDelivery("CHG-20W");
    await advance(agent, toCollect.id, ["confirmed", "shipped", "delivered"]);
    const collected = await placeDelivery("CHG-20W");
    await advance(agent, collected.id, ["confirmed", "shipped", "delivered"]);
    await agent.post(`/admin/orders/${collected.id}/collect`).send({ method: "baridimob" }).expect(200);
    const returned = await placeDelivery("CHG-20W");
    await advance(agent, returned.id, ["confirmed", "shipped", "returned"]);

    const { body } = await agent.get("/admin/deliveries/summary");
    expect(body.data.inProgress).toEqual({ count: 1, total: inProgress.total });
    expect(body.data.toCollect).toEqual({ count: 1, total: toCollect.total });
    expect(body.data.returned.count).toBe(1);
    expect(body.data.collectedByDay).toEqual([{ date: "2026-11-14", total: collected.total }]);
    expect(body.data.collectedTotal).toBe(collected.total);
  });

  it("est réservé à l'admin", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/deliveries/summary")).status).toBe(403);
  });
});

describe("l'accueil du back-office", () => {
  it("compte une livraison dans les ventes du jour d'encaissement, pas avant, et pas si retournée", async () => {
    const { agent } = await loginAs("admin");
    const order = await placeDelivery();
    await advance(agent, order.id, ["confirmed", "shipped", "delivered"]);
    let stats = (await agent.get("/admin/stats")).body.data;
    expect(stats.revenueToday).toBe(0);

    vi.setSystemTime(at("2026-11-15T09:00"));
    await agent.post(`/admin/orders/${order.id}/collect`).send({ method: "cash" }).expect(200);
    stats = (await agent.get("/admin/stats")).body.data;
    expect(stats.revenueToday).toBe(order.total);
  });
});
