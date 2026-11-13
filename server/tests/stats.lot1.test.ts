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
});
