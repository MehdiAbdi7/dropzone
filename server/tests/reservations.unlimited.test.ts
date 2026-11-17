import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { releaseExpiredReservations } from "../src/modules/orders/reservations.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// La réservation illimitée avec avance BaridiMob (18/11) : le client choisit « illimitée » à la commande, le
// magasin l'appelle, lui envoie le numéro BaridiMob (un bouton), reçoit l'avance, la confirme : la réservation
// passe « en cours » et l'avance est écrite dans l'argent. Au retrait, le client ne paie que le reste.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

// Chaque appel est un nouvel admin (une adresse à lui) : `loginAs` crée le compte à chaque fois.
let adminCount = 0;
async function configure(advance = 20_000, baridiNumber = "00799999 0012345678 90") {
  adminCount += 1;
  const { agent } = await loginAs("admin", `reglages${adminCount}@test.dz`);
  const response = await agent.put("/admin/store/reservation").send({ advance, baridiNumber });
  expect(response.status).toBe(200);
  return agent;
}

async function reserveUnlimited(extra: Record<string, unknown> = {}) {
  return previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], { fulfillment: "pickup", reservationMode: "unlimited", ...extra });
}

beforeEach(async () => {
  await resetDb();
  // Les réglages du magasin survivent à resetDb : l'offre repart coupée à chaque test.
  await prisma.storeSettings.update({ where: { id: 1 }, data: { reservationAdvance: 0, baridiNumber: "" } });
  await createCatalog();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-18T10:00"));
});

afterEach(async () => {
  vi.useRealTimers();
  // Les réglages du magasin survivent à resetDb : on les remet à leur valeur de départ pour les autres fichiers.
  await prisma.storeSettings.update({ where: { id: 1 }, data: { reservationAdvance: 0, baridiNumber: "" } });
});

describe("Réglages de la réservation illimitée", () => {
  it("l'admin règle l'avance et le numéro ; le public ne voit que le montant", async () => {
    await configure(25_000, "0079 9999");
    const { agent } = await loginAs("admin", "autre@test.dz");
    expect((await agent.get("/admin/store/reservation")).body.data).toEqual({ advance: 25_000, baridiNumber: "0079 9999" });
    const publicOffer = await request(app).get("/store/reservation");
    expect(publicOffer.body.data).toEqual({ unlimitedAdvance: 25_000 });
    expect(JSON.stringify(publicOffer.body)).not.toContain("0079");
  });

  it("l'offre n'existe pas sans avance ou sans numéro", async () => {
    await configure(0, "0079 9999");
    expect((await request(app).get("/store/reservation")).body.data).toEqual({ unlimitedAdvance: null });
    await configure(20_000, "");
    expect((await request(app).get("/store/reservation")).body.data).toEqual({ unlimitedAdvance: null });
  });

  it("est réservé à l'admin", async () => {
    const { agent } = await loginAs("order_manager");
    expect((await agent.put("/admin/store/reservation").send({ advance: 1000, baridiNumber: "1" })).status).toBe(403);
    expect((await agent.get("/admin/store/reservation")).status).toBe(403);
  });
});

describe("Commander une réservation illimitée", () => {
  it("garde l'appareil sans date : pas de créneau, pas d'expiration, avance copiée sur la commande", async () => {
    await configure();
    const before = await stockOf("IP-NEW-256");
    const response = await reserveUnlimited();
    expect(response.status).toBe(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { number: response.body.data.number } });
    expect(order).toMatchObject({
      type: "pickup",
      status: "reserved",
      reservationMode: "unlimited",
      advanceAmount: 20_000,
      pickupDate: null,
      pickupTime: null,
      reservedUntil: null,
      baridiNumber: null,
      baridiSharedAt: null,
      advancePaidAt: null,
    });
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);

    // Dix jours plus tard : jamais expirée.
    vi.setSystemTime(at("2026-11-28T10:00"));
    expect(await releaseExpiredReservations(new Date())).toBe(0);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("reserved");
  });

  it("refuse quand l'offre n'est pas réglée", async () => {
    const response = await reserveUnlimited();
    expect(response.status).toBe(400);
  });

  it("la réservation de deux jours marche toujours et exige un créneau", async () => {
    await configure();
    const without = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], { fulfillment: "pickup", reservationMode: "two_days" });
    expect(without.status).toBe(400);
    const ok = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
      fulfillment: "pickup",
      pickupDate: "2026-11-18",
      pickupTime: "15:00",
    });
    expect(ok.status).toBe(201);
    const order = await prisma.order.findUniqueOrThrow({ where: { number: ok.body.data.number } });
    expect(order).toMatchObject({ reservationMode: "two_days", advanceAmount: null });
    expect(order.reservedUntil).not.toBeNull();
  });
});

describe("Le numéro BaridiMob et l'avance", () => {
  async function ordered() {
    await configure();
    const created = await reserveUnlimited();
    const order = await prisma.order.findUniqueOrThrow({ where: { number: created.body.data.number } });
    const { agent } = await loginAs("order_manager", "resp@test.dz");
    return { order, agent, phone: order.phone };
  }
  const track = (number: number, phone: string) => request(app).post("/orders/track").send({ number, phone });

  it("le client ne voit le numéro qu'après le bouton du magasin", async () => {
    const { order, agent, phone } = await ordered();
    const before = await track(order.number, phone);
    expect(before.body.data).toMatchObject({ reservationMode: "unlimited", advanceAmount: 20_000, baridiNumber: null });
    expect(JSON.stringify(before.body)).not.toContain("00799999");

    const share = await agent.post(`/admin/orders/${order.id}/baridi-number`).send({});
    expect(share.status).toBe(200);
    const after = await track(order.number, phone);
    expect(after.body.data).toMatchObject({ baridiNumber: "00799999 0012345678 90", advancePaidAt: null });
  });

  it("le numéro envoyé reste celui d'alors, même si l'admin change le réglage ensuite", async () => {
    const { order, agent, phone } = await ordered();
    await agent.post(`/admin/orders/${order.id}/baridi-number`).send({}).expect(200);
    await configure(30_000, "AUTRE NUMERO");
    expect((await track(order.number, phone)).body.data).toMatchObject({ baridiNumber: "00799999 0012345678 90", advanceAmount: 20_000 });
  });

  it("refuse d'envoyer le numéro deux fois, ou pour une commande qui n'est pas une réservation illimitée", async () => {
    const { order, agent } = await ordered();
    await agent.post(`/admin/orders/${order.id}/baridi-number`).send({}).expect(200);
    expect((await agent.post(`/admin/orders/${order.id}/baridi-number`).send({})).status).toBe(409);
    const two = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], { fulfillment: "pickup", pickupDate: "2026-11-18", pickupTime: "15:00" });
    const twoOrder = await prisma.order.findUniqueOrThrow({ where: { number: two.body.data.number } });
    expect((await agent.post(`/admin/orders/${twoOrder.id}/baridi-number`).send({})).status).toBe(409);
  });

  it("l'avance reçue : la réservation reste ouverte (en cours), l'argent entre en BaridiMob, une seule fois", async () => {
    const { order, agent, phone } = await ordered();
    // Pas avant d'avoir envoyé le numéro.
    expect((await agent.post(`/admin/orders/${order.id}/advance-received`).send({})).status).toBe(409);
    await agent.post(`/admin/orders/${order.id}/baridi-number`).send({}).expect(200);
    const received = await agent.post(`/admin/orders/${order.id}/advance-received`).send({});
    expect(received.status).toBe(200);
    expect((await agent.post(`/admin/orders/${order.id}/advance-received`).send({})).status).toBe(409);

    const saved = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(saved.status).toBe("reserved");
    expect(saved.advancePaidAt).not.toBeNull();
    const movements = await prisma.moneyMovement.findMany({ where: { orderId: order.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ amount: 20_000, method: "baridimob", kind: "pickup", orderType: "pickup" });
    expect((await track(order.number, phone)).body.data.advancePaidAt).not.toBeNull();
  });

  it("au retrait, le client ne paie que le reste", async () => {
    const { order, agent } = await ordered();
    await agent.post(`/admin/orders/${order.id}/baridi-number`).send({}).expect(200);
    await agent.post(`/admin/orders/${order.id}/advance-received`).send({}).expect(200);
    // Le client vient une semaine plus tard : on se connecte après avoir avancé l'horloge (la session expirerait).
    vi.setSystemTime(at("2026-11-25T16:00"));
    const { agent: admin } = await loginAs("admin", "admin2@test.dz");
    await admin.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    const response = await admin.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" });
    expect(response.status).toBe(200);
    const movements = await prisma.moneyMovement.findMany({ where: { orderId: order.id }, orderBy: { id: "asc" } });
    expect(movements.map((movement) => [movement.method, movement.amount])).toEqual([
      ["baridimob", 20_000],
      ["cash", order.total - 20_000],
    ]);
  });

  it("sans avance, le retrait encaisse tout, même sans date limite", async () => {
    const { order } = await ordered();
    vi.setSystemTime(at("2026-12-02T16:00"));
    const { agent: admin } = await loginAs("admin", "admin3@test.dz");
    await admin.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    await admin.post(`/admin/orders/${order.id}/pickup`).send({ method: "cash" }).expect(200);
    const movements = await prisma.moneyMovement.findMany({ where: { orderId: order.id } });
    expect(movements.map((movement) => movement.amount)).toEqual([order.total]);
  });

  it("annuler remet l'appareil en stock", async () => {
    const { order, agent } = await ordered();
    const before = await stockOf("IP-NEW-256");
    await agent.patch(`/admin/orders/${order.id}/status`).send({ status: "cancelled" }).expect(200);
    expect(await stockOf("IP-NEW-256")).toBe(before + 1);
  });

  it("le vendeur n'envoie pas le numéro (réservé au responsable commande)", async () => {
    const { order } = await ordered();
    const { agent: seller } = await loginAs("seller", "vendeur@test.dz");
    expect((await seller.post(`/admin/orders/${order.id}/baridi-number`).send({})).status).toBe(403);
    expect((await seller.post(`/admin/orders/${order.id}/advance-received`).send({})).status).toBe(403);
  });
});
