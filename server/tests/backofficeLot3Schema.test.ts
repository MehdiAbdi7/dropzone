import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { resetDb } from "./helpers.js";

// Le lot 3 du back-office magasin (16/11) : la ligne de commande garde le prix catalogue et qui a
// accordé la remise.
beforeEach(resetDb);

const orderWithItem = (item: { listPrice?: number | null; grantedById?: number | null }) =>
  prisma.order.create({
    data: {
      fullName: "Client Test",
      phone: "0555123456",
      type: "in_store",
      status: "picked_up",
      dailyNumber: 1,
      businessDate: new Date("2026-11-16T00:00:00Z"),
      subtotal: 290_000,
      shippingFee: 0,
      total: 290_000,
      items: { create: [{ sku: "X-1", name: "Appareil", unitPrice: 290_000, quantity: 1, ...item }] },
    },
    include: { items: true },
  });

describe("order_items : prix catalogue et auteur de la remise", () => {
  it("garde le prix catalogue et qui a accordé le prix", async () => {
    const order = await orderWithItem({ listPrice: 299_000, grantedById: 7 });
    expect(order.items[0]).toMatchObject({ unitPrice: 290_000, listPrice: 299_000, grantedById: 7 });
  });

  it("reste valable sans ces champs (les commandes d'avant le lot 3)", async () => {
    const order = await orderWithItem({});
    expect(order.items[0]).toMatchObject({ listPrice: null, grantedById: null });
  });

  it("refuse un prix catalogue négatif", async () => {
    await expect(orderWithItem({ listPrice: -1 })).rejects.toThrow();
  });
});
