import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// L'accueil du back-office (14/11) : la journée du magasin plutôt que le stock faible.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const TODAY = "2026-11-14";
const TOMORROW = "2026-11-15";
const reserve = (pickupDate: string, pickupTime: string, fullName = "Amine Test") =>
  previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], { fulfillment: "pickup", pickupDate, pickupTime, fullName });

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-14T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /admin/stats", () => {
  it("n'a plus de stock faible", async () => {
    const { agent } = await loginAs("admin");
    const response = await agent.get("/admin/stats");
    expect(response.status).toBe(200);
    expect(response.body.data).not.toHaveProperty("lowStock");
  });

  it("liste les retraits attendus aujourd'hui, par heure", async () => {
    await reserve(TODAY, "17:00", "Karim Tard");
    await reserve(TODAY, "11:00", "Sofia Tôt");
    await reserve(TOMORROW, "10:00", "Demain");
    const { agent } = await loginAs("admin");
    const { pickupsToday } = (await agent.get("/admin/stats")).body.data;
    expect(pickupsToday.map((p: { fullName: string; pickupTime: string }) => [p.fullName, p.pickupTime])).toEqual([
      ["Sofia Tôt", "11:00"],
      ["Karim Tard", "17:00"],
    ]);
    expect(pickupsToday[0]).toMatchObject({ dailyNumber: 2, phone: "0555123456" });
  });

  it("ne compte pas une réservation comme une vente, et dit ce qui est encaissé", async () => {
    const order = await reserve(TODAY, "15:00");
    const { agent } = await loginAs("admin");
    const before = (await agent.get("/admin/stats")).body.data;
    expect(before).toMatchObject({ revenueToday: 0, ordersToday: 0, cash: { open: false, closed: false, cashedToday: 0 } });

    await agent.post("/admin/cash/open").send({ openingFloat: 5000 });
    const { id } = await prisma.order.findUniqueOrThrow({ where: { number: order.body.data.number } });
    await agent.post(`/admin/orders/${id}/pickup`).send({ method: "cash" });
    const after = (await agent.get("/admin/stats")).body.data;
    expect(after.revenueToday).toBe(order.body.data.total);
    expect(after.cash).toMatchObject({ open: true, closed: false, cashedToday: order.body.data.total });
  });

  // Lot 2 (15/11) : un retrait compte à la date de son paiement, pas de sa réservation.
  it("compte un retrait réservé hier et payé aujourd'hui dans les ventes d'aujourd'hui", async () => {
    vi.setSystemTime(at("2026-11-13T12:00"));
    const order = await reserve(TODAY, "15:00");
    const { agent } = await loginAs("admin");
    vi.setSystemTime(at("2026-11-14T10:00"));
    await agent.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    const { id } = await prisma.order.findUniqueOrThrow({ where: { number: order.body.data.number } });
    await agent.post(`/admin/orders/${id}/pickup`).send({ method: "cash" }).expect(200);

    const today = (await agent.get("/admin/stats")).body.data;
    expect(today).toMatchObject({ revenueToday: order.body.data.total, ordersToday: 1 });
    // La veille, cette vente n'existait pas encore : l'ancien calcul l'aurait rangée au 13.
    vi.setSystemTime(at("2026-11-13T18:00"));
    expect((await agent.get("/admin/stats")).body.data).toMatchObject({ revenueToday: 0, ordersToday: 0 });
  });

  it("range un retrait réservé le 31/10 et payé le 01/11 dans novembre, et suit l'horloge de l'application", async () => {
    vi.setSystemTime(at("2026-10-31T12:00"));
    const order = await reserve("2026-11-01", "15:00");
    expect(order.status).toBe(201);
    const { agent } = await loginAs("admin");
    vi.setSystemTime(at("2026-11-01T10:00"));
    await agent.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    const { id } = await prisma.order.findUniqueOrThrow({ where: { number: order.body.data.number } });
    await agent.post(`/admin/orders/${id}/pickup`).send({ method: "cash" }).expect(200);

    expect((await agent.get("/admin/stats")).body.data).toMatchObject({ revenueMonth: order.body.data.total });
    // Le 31/10, avant le paiement : le mois d'octobre n'a rien vendu.
    vi.setSystemTime(at("2026-10-31T23:00"));
    expect((await agent.get("/admin/stats")).body.data.revenueMonth).toBe(0);
  });

  it("garde une livraison à sa date de commande", async () => {
    await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
    const { agent } = await loginAs("admin");
    const stats = (await agent.get("/admin/stats")).body.data;
    expect(stats.ordersToday).toBe(1);
    expect(stats.revenueToday).toBeGreaterThan(0);
  });
});
