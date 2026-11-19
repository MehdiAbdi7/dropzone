import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { computeShippingFee } from "../src/config/shipping.js";
import { algiersMidnightAfter, pickupDays, pickupSlots } from "../src/utils/algiersTime.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// La commande prise par téléphone (19/11) : le vendeur saisit au back-office une livraison ou une réservation
// pour un client qui appelle. Elle démarre comme une commande du site (« À confirmer » ou « Réservée »).
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  // resetDb ne remet pas la réservation illimitée à zéro : chaque test part de « offre coupée ».
  await prisma.storeSettings.update({ where: { id: 1 }, data: { reservationAdvance: 0, baridiNumber: "" } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

const delivery = (over: Record<string, unknown> = {}) => ({
  fulfillment: "delivery",
  fullName: "Amine Test",
  phone: "0555 12 34 56",
  wilaya: "Alger",
  commune: "Kouba",
  address: "12 rue des Frères Bouadou",
  lines: [{ sku: "IP-NEW-256", quantity: 1 }],
  ...over,
});

describe("POST /admin/orders, livraison", () => {
  it("crée une livraison à confirmer : stock, prix d'achat, numéro du jour, auteur, aucun argent", async () => {
    const { agent, user } = await loginAs("seller");
    const before = await stockOf("IP-NEW-256");
    const response = await agent.post("/admin/orders").send(delivery());
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ dailyNumber: 1, type: "delivery", status: "pending", total: 245_000 + computeShippingFee(245_000) });

    const order = await prisma.order.findFirstOrThrow({ include: { items: true } });
    expect(order).toMatchObject({
      type: "delivery",
      status: "pending",
      phone: "0555123456",
      wilaya: "Alger",
      takenById: user.id,
      userId: null,
    });
    expect(order.items[0]).toMatchObject({ unitPrice: 245_000, listPrice: 245_000, unitCost: 200_000 });
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);
    expect(await prisma.moneyMovement.count()).toBe(0);
  });

  it("calcule les frais comme le site, et accepte des frais saisis à la main", async () => {
    const { agent } = await loginAs("seller");
    const auto = await agent.post("/admin/orders").send(delivery());
    expect(auto.body.data.total - 245_000).toBe(computeShippingFee(245_000));

    const manual = await agent.post("/admin/orders").send(delivery({ shippingFee: 1200 }));
    expect(manual.status).toBe(201);
    expect(manual.body.data.total).toBe(246_200);
    const stored = await prisma.order.findUniqueOrThrow({ where: { id: manual.body.data.id } });
    expect(stored.shippingFee).toBe(1200);

    expect((await agent.post("/admin/orders").send(delivery({ shippingFee: -5 }))).status).toBe(400);
  });

  it("refuse un reconditionné à limitations quand le client ne les a pas acceptées", async () => {
    const { agent } = await loginAs("seller");
    const lines = [{ sku: "IP-R-WIFI", quantity: 1 }];
    const refused = await agent.post("/admin/orders").send(delivery({ lines }));
    expect(refused.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
    expect(await stockOf("IP-R-WIFI")).toBe(1);

    const accepted = await agent.post("/admin/orders").send(delivery({ lines, acceptLimitations: true }));
    expect(accepted.status).toBe(201);
    expect((await prisma.order.findFirstOrThrow()).limitationsAccepted).toBe(true);
  });

  it("refuse tout quand un article est épuisé, sans consommer de numéro du jour", async () => {
    const { agent } = await loginAs("seller");
    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { stock: 0 } });
    const refused = await agent.post("/admin/orders").send(delivery());
    expect(refused.status).toBe(409);
    expect(await prisma.order.count()).toBe(0);

    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { stock: 3 } });
    const next = await agent.post("/admin/orders").send(delivery());
    expect(next.body.data.dailyNumber).toBe(1);
  });

  it("garde le prix catalogue et dit qui a accordé un prix négocié", async () => {
    const { agent, user } = await loginAs("seller");
    const response = await agent.post("/admin/orders").send(delivery({ lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 240_000 }] }));
    expect(response.status).toBe(201);
    expect(await prisma.orderItem.findFirstOrThrow()).toMatchObject({ unitPrice: 240_000, listPrice: 245_000, grantedById: user.id });
  });

  it("n'est ouverte qu'au vendeur et au-dessus", async () => {
    for (const role of ["technician", "customer"] as const) {
      const { agent } = await loginAs(role);
      expect((await agent.post("/admin/orders").send(delivery())).status, role).toBe(403);
    }
    expect((await request(app).post("/admin/orders").send(delivery())).status).toBe(401);
    expect(await prisma.order.count()).toBe(0);

    for (const role of ["order_manager", "admin"] as const) {
      const { agent } = await loginAs(role);
      expect((await agent.post("/admin/orders").send(delivery())).status, role).toBe(201);
    }
  });
});

// Les horaires de départ de resetDb : 09:00 à 20:00, aucun jour fermé. Les jours et les créneaux se lisent avec
// les mêmes fonctions que le serveur, jamais en dur.
const HOURS = { openingTime: "09:00", closingTime: "20:00", closedDays: [] as number[] };
const NOW = at("2026-11-16T10:00");

const reservation = (over: Record<string, unknown> = {}) => {
  const [day] = pickupDays(HOURS, NOW).slice(1);
  return {
    fulfillment: "pickup",
    fullName: "Amine Test",
    phone: "0555 12 34 56",
    pickupDate: day,
    pickupTime: pickupSlots(HOURS, day, NOW)[0],
    lines: [{ sku: "IP-NEW-256", quantity: 1 }],
    ...over,
  };
};

const turnOnUnlimited = () =>
  prisma.storeSettings.update({ where: { id: 1 }, data: { reservationAdvance: 5000, baridiNumber: "00799999000123456789" } });

describe("POST /admin/orders, réservation", () => {
  it("crée une réservation de deux jours : réservée, créneau vérifié, sans frais, stock pris", async () => {
    const { agent, user } = await loginAs("seller");
    const body = reservation();
    const before = await stockOf("IP-NEW-256");
    const response = await agent.post("/admin/orders").send(body);
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ type: "pickup", status: "reserved", reservationMode: "two_days", total: 245_000 });
    expect(response.body.data.pickupDate).toBe(body.pickupDate);

    const order = await prisma.order.findFirstOrThrow();
    expect(order).toMatchObject({ type: "pickup", status: "reserved", shippingFee: 0, takenById: user.id, pickupTime: body.pickupTime });
    expect(order.reservedUntil?.getTime()).toBe(algiersMidnightAfter(body.pickupDate as string).getTime());
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);
    expect(await prisma.moneyMovement.count()).toBe(0);
  });

  it("refuse un jour hors des deux proposés et un créneau déjà passé", async () => {
    const { agent } = await loginAs("seller");
    const far = await agent.post("/admin/orders").send(reservation({ pickupDate: "2026-11-21" }));
    expect(far.status).toBe(400);
    expect(far.body.error?.message ?? far.body.message).toContain("créneau");

    expect(pickupSlots(HOURS, "2026-11-16", NOW)).not.toContain("09:00");
    const past = await agent.post("/admin/orders").send(reservation({ pickupDate: "2026-11-16", pickupTime: "09:00" }));
    expect(past.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuse une réservation de deux jours sans jour ni heure", async () => {
    const { agent } = await loginAs("seller");
    const response = await agent.post("/admin/orders").send(reservation({ pickupDate: undefined, pickupTime: undefined }));
    expect(response.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("illimitée : sans date, l'avance des réglages est copiée sur la commande", async () => {
    await turnOnUnlimited();
    const { agent } = await loginAs("seller");
    const response = await agent
      .post("/admin/orders")
      .send(reservation({ reservationMode: "unlimited", pickupDate: undefined, pickupTime: undefined }));
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ status: "reserved", reservationMode: "unlimited", advanceAmount: 5000, pickupDate: null });
    const order = await prisma.order.findFirstOrThrow();
    expect(order).toMatchObject({ reservationMode: "unlimited", advanceAmount: 5000, pickupDate: null, pickupTime: null, reservedUntil: null });
  });

  it("illimitée refusée tant que l'avance ou le numéro BaridiMob ne sont pas réglés", async () => {
    const { agent } = await loginAs("seller");
    const unlimited = reservation({ reservationMode: "unlimited", pickupDate: undefined, pickupTime: undefined });

    expect((await agent.post("/admin/orders").send(unlimited)).status).toBe(400);
    await prisma.storeSettings.update({ where: { id: 1 }, data: { reservationAdvance: 5000 } });
    expect((await agent.post("/admin/orders").send(unlimited)).status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });
});
