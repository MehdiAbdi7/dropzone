import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { releaseExpiredReservations } from "../src/modules/orders/reservations.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Valider un retrait (14/11) : le client vient et paie ; l'argent entre dans la caisse du jour.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

async function reserve() {
  const response = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
    fulfillment: "pickup",
    pickupDay: "today",
    pickupTime: "15:00",
  });
  expect(response.status).toBe(201);
  return prisma.order.findUniqueOrThrow({ where: { number: response.body.data.number } });
}

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /admin/orders/:id/pickup", () => {
  it("refuse tant que la journée de caisse n'est pas ouverte", async () => {
    const order = await reserve();
    const { agent } = await loginAs("admin");
    const response = await agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Ouvrez la journée de caisse d'abord");
  });

  it("encaisse le retrait dans la caisse du jour", async () => {
    const order = await reserve();
    const { agent, user } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10000 });
    vi.setSystemTime(at("2026-11-14T15:05"));
    const response = await agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: "picked_up" });

    expect(await prisma.moneyMovement.findMany({ select: { amount: true, method: true, kind: true, orderId: true, userId: true } })).toEqual([
      { amount: order.total, method: "cash", kind: "pickup", orderId: order.id, userId: user.id },
    ]);
    const cash = await agent.get("/admin/cash/today");
    expect(cash.body.data.summary).toMatchObject({ cashIn: order.total, expectedCash: 10000 + order.total });
  });

  it("range un paiement BaridiMob hors du tiroir", async () => {
    const order = await reserve();
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 0 });
    await agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "baridimob" });
    const cash = await agent.get("/admin/cash/today");
    expect(cash.body.data.summary).toMatchObject({ cashIn: 0, byMethod: { baridimob: order.total } });
  });

  it("n'encaisse qu'une fois, même avec deux clics simultanés", async () => {
    const order = await reserve();
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 0 });
    const responses = await Promise.all([
      agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" }),
      agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.moneyMovement.count()).toBe(1);
  });

  it("refuse un retrait expiré, sans encaisser ni toucher au stock", async () => {
    const before = await stockOf("IP-NEW-256");
    const order = await reserve();
    const { agent } = await loginAs("admin");
    vi.setSystemTime(at("2026-11-15T09:00"));
    await agent.post("/admin/cash/open").send({ openingFloat: 0 });
    await releaseExpiredReservations(new Date());
    const response = await agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" });
    expect(response.status).toBe(409);
    expect(await prisma.moneyMovement.count()).toBe(0);
    expect(await stockOf("IP-NEW-256")).toBe(before);
  });

  it("refuse un moyen de paiement inconnu et une commande qui n'est pas un retrait", async () => {
    const order = await reserve();
    const delivery = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
    const deliveryOrder = await prisma.order.findUniqueOrThrow({ where: { number: delivery.body.data.number } });
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 0 });
    expect((await agent.post(`/admin/orders/${order.id}/pickup`).send({ method: "cheque" })).status).toBe(400);
    expect((await agent.post(`/admin/orders/${deliveryOrder.id}/pickup`).send({ method: "cash" })).status).toBe(409);
  });
});

describe("les états d'un retrait", () => {
  it("un retrait réservé peut être annulé, ce qui rend le stock", async () => {
    const before = await stockOf("IP-NEW-256");
    const order = await reserve();
    const { agent } = await loginAs("admin");
    const response = await agent.patch(`/admin/orders/${order.id}/status`).send({ status: "cancelled" });
    expect(response.status).toBe(200);
    expect(await stockOf("IP-NEW-256")).toBe(before);
  });

  it("« récupérée » ne se met pas à la main : il faut valider le retrait avec son paiement", async () => {
    const order = await reserve();
    const { agent } = await loginAs("admin");
    const response = await agent.patch(`/admin/orders/${order.id}/status`).send({ status: "picked_up" });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe("Validez le retrait avec son moyen de paiement");
  });
});
