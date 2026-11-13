import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { resetDb } from "./helpers.js";

// Le lot 2 du back-office magasin (15/11) : le journal des modifications de commande.
beforeEach(resetDb);

const order = () =>
  prisma.order.create({
    data: {
      fullName: "Client Test",
      phone: "0555123456",
      dailyNumber: 1,
      businessDate: new Date("2026-11-15T00:00:00Z"),
      wilaya: "16 - Alger",
      commune: "Kouba",
      address: "Rue 1",
      subtotal: 1000,
      shippingFee: 0,
      total: 1000,
    },
  });

describe("order_events", () => {
  it("une trace survit à la suppression de sa commande", async () => {
    const created = await order();
    await prisma.orderEvent.create({
      data: { kind: "deleted", orderId: created.id, orderNumber: created.number, summary: "Supprimée", amountDelta: -1000 },
    });
    await prisma.order.delete({ where: { id: created.id } });
    const events = await prisma.orderEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "deleted", orderId: created.id, amountDelta: -1000 });
  });

  it("resetDb vide aussi les traces", async () => {
    await prisma.orderEvent.create({ data: { kind: "edited", orderNumber: 1001, summary: "Prix changé" } });
    await resetDb();
    expect(await prisma.orderEvent.count()).toBe(0);
  });
});
