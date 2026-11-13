import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, customer, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Le retrait au magasin (14/11) : le client choisit l'un des deux jours proposés et une heure ; le
// téléphone est réservé (stock retiré) jusqu'à minuit le jour choisi ; il paie au magasin.
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;
const at = (algiers: string) => new Date(`${algiers}+01:00`);

// Le client envoie le jour exact choisi (« 2026-11-15 »), parmi les deux jours que le formulaire
// propose : le serveur n'a pas à deviner ce que « demain » voulait dire à 23h59.
const TODAY = "2026-11-14";
const TOMORROW = "2026-11-15";
const DAY_AFTER = "2026-11-16";

// Un retrait : pas d'adresse, un jour et une heure.
const pickup = (pickupDate: string, pickupTime: string) => ({
  fulfillment: "pickup",
  pickupDate,
  pickupTime,
  wilaya: undefined,
  commune: undefined,
  address: undefined,
});

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  // Le 14/11/2026 à 10h, heure d'Alger (un samedi). Seule la date est figée : les timers
  // restent réels pour la base et supertest.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /orders en retrait au magasin", () => {
  it("réserve l'appareil : stock retiré, sans frais de livraison, réservé jusqu'à minuit le jour choisi", async () => {
    const before = await stockOf("IP-NEW-256");
    const response = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TOMORROW, "15:30"));
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ type: "pickup", pickupDate: "2026-11-15", pickupTime: "15:30" });
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);

    const order = await prisma.order.findFirstOrThrow();
    expect(order).toMatchObject({ status: "reserved", type: "pickup", shippingFee: 0, wilaya: null, address: null });
    expect(order.total).toBe(order.subtotal);
    expect(order.reservedUntil?.toISOString()).toBe("2026-11-15T23:00:00.000Z");
  });

  it("numérote chaque commande dans sa journée", async () => {
    const first = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TODAY, "15:00"));
    const second = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
    expect([first.body.data.dailyNumber, second.body.data.dailyNumber]).toEqual([1, 2]);
  });

  it("refuse un créneau hors des horaires, déjà passé, ou un jour fermé", async () => {
    const tooLate = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TODAY, "20:00"));
    expect(tooLate.status).toBe(400);
    expect(tooLate.body.error.message).toBe("Ce créneau n'est pas disponible");

    const past = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TODAY, "09:30"));
    expect(past.status).toBe(400);

    // Le 15/11/2026 est un dimanche (0) : un jour fermé n'est jamais proposé.
    await prisma.storeSettings.update({ where: { id: 1 }, data: { closedDays: [0] } });
    const closed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TOMORROW, "15:30"));
    expect(closed.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("saute le jour fermé : le lundi prend sa place parmi les deux jours proposés", async () => {
    await prisma.storeSettings.update({ where: { id: 1 }, data: { closedDays: [0] } });
    const response = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(DAY_AFTER, "15:30"));
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ pickupDate: DAY_AFTER });
  });

  it("refuse un jour qui n'est pas l'un des deux proposés", async () => {
    // À 10h le samedi, les deux jours sont samedi et dimanche : lundi n'est pas encore ouvert.
    const tooFar = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(DAY_AFTER, "15:30"));
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.error.message).toBe("Ce créneau n'est pas disponible");
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuse l'ancien format « today » / « tomorrow » et une date mal écrite", async () => {
    const old = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
      ...pickup(TODAY, "15:00"),
      pickupDate: undefined,
      pickupDay: "today",
    });
    expect(old.status).toBe(400);
    const wrong = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup("demain", "15:00"));
    expect(wrong.status).toBe(400);
  });

  // Les stories d'affaires sortent à 21h : la nuit, le client réserve pour demain ou après-demain.
  it("la nuit, propose demain et après-demain, et plus aujourd'hui", async () => {
    vi.setSystemTime(at("2026-11-14T21:30"));
    const today = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TODAY, "19:30"));
    expect(today.status).toBe(400);

    const tomorrow = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TOMORROW, "09:00"));
    expect(tomorrow.status).toBe(201);
    const dayAfter = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(DAY_AFTER, "09:00"));
    expect(dayAfter.status).toBe(201);
    expect(dayAfter.body.data).toMatchObject({ pickupDate: DAY_AFTER });

    const order = await prisma.order.findFirstOrThrow({ orderBy: { id: "desc" } });
    expect(order.reservedUntil?.toISOString()).toBe("2026-11-16T23:00:00.000Z");
  });

  it("n'exige pas d'adresse pour un retrait, et l'exige toujours pour une livraison", async () => {
    const delivery = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], {
      fulfillment: "delivery",
      address: undefined,
    });
    expect(delivery.status).toBe(400);
    const withoutChoice = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], { fulfillment: undefined });
    expect(withoutChoice.status).toBe(201);
    expect((await prisma.order.findFirstOrThrow()).type).toBe("delivery");
  });
});

describe("POST /orders/preview", () => {
  it("n'ajoute pas de frais de livraison à un retrait", async () => {
    // Un petit panier : en livraison, il paierait les frais.
    const items = [{ sku: "COQ-IP15PM", quantity: 1 }];
    const delivery = await request(app).post("/orders/preview").send({ items });
    const pickupPreview = await request(app).post("/orders/preview").send({ items, fulfillment: "pickup" });
    expect(delivery.body.data.shippingFee).toBeGreaterThan(0);
    expect(pickupPreview.body.data.shippingFee).toBe(0);
    expect(pickupPreview.body.data.total).toBe(pickupPreview.body.data.subtotal);
  });
});

it("le client de test reste une livraison par défaut", () => {
  expect(customer).not.toHaveProperty("fulfillment");
});

describe("POST /orders/track d'un retrait", () => {
  it("renvoie le type, le numéro du jour, le jour et l'heure du retrait", async () => {
    const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TOMORROW, "15:30"));
    const response = await request(app).post("/orders/track").send({ number: placed.body.data.number, phone: "0555123456" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      type: "pickup",
      status: "reserved",
      dailyNumber: 1,
      pickupDate: "2026-11-15",
      pickupTime: "15:30",
    });
  });
});

describe("GET /admin/orders par type", () => {
  it("ne renvoie que les retraits, avec leur numéro du jour et leur créneau", async () => {
    await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
    await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], pickup(TOMORROW, "15:30"));
    const { agent } = await loginAs("admin");
    const response = await agent.get("/admin/orders?type=pickup");
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ type: "pickup", dailyNumber: 2, pickupTime: "15:30" });
    expect(response.body.data[0].pickupDate.slice(0, 10)).toBe("2026-11-15");
    expect((await agent.get("/admin/orders?type=delivery")).body.data).toHaveLength(1);
  });
});
