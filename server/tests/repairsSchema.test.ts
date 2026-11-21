import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { partCategoryId, resetDb } from "./helpers.js";

// Les garde-fous de la base pour les fiches de réparation (18/11, étape 2) : même si le code se trompe, la base
// refuse une main-d'œuvre négative, une quantité absurde et une garantie sans date de fin. Écrits en SQL brut :
// ils vérifient la migration, pas le client Prisma.
beforeEach(resetDb);

type RepairOver = { labor?: number | null; underWarranty?: boolean; endsAt?: string | null };

const addRepair = async (over: RepairOver = {}) => {
  const labor = over.labor === undefined ? null : over.labor;
  const under = over.underWarranty ?? false;
  const ends = over.endsAt === undefined ? null : over.endsAt;
  const [row] = await prisma.$queryRaw<{ id: number; number: number }[]>`
    INSERT INTO repairs (full_name, phone, device_name, issue, labor_price, under_warranty, warranty_ends_at, updated_at)
    VALUES ('Karim Benali', '0550123456', 'iPhone 13', 'Écran cassé', ${labor}, ${under}, ${ends}::date, now())
    RETURNING id, number`;
  return row;
};

const addPart = async (name = "Batterie iPhone 13") => {
  const categoryId = await partCategoryId();
  const [row] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO parts (name, category_id, purchase_price, sale_price, stock) VALUES (${name}, ${categoryId}, 3500, 6000, 5) RETURNING id`;
  return row.id;
};

const addLine = (repairId: number, partId: number, quantity = 1) =>
  prisma.$executeRaw`INSERT INTO repair_parts (repair_id, part_id, name, quantity, unit_cost, unit_price)
    VALUES (${repairId}, ${partId}, 'Batterie iPhone 13', ${quantity}, 3500, 6000)`;

describe("la table repairs", () => {
  it("numérote les fiches à partir de 1001, sans toucher au compteur des commandes", async () => {
    const first = await addRepair();
    const second = await addRepair();
    expect([first.number, second.number]).toEqual([1001, 1002]);

    const order = await prisma.order.create({
      data: { fullName: "Client", phone: "0550123456", type: "in_store", status: "picked_up", dailyNumber: 1, businessDate: new Date("2026-11-18"), subtotal: 0, shippingFee: 0, total: 0 },
      select: { number: true },
    });
    expect(order.number).toBe(1001);
  });

  it("refuse une main-d'œuvre négative", async () => {
    await expect(addRepair({ labor: -1 })).rejects.toThrow();
    await expect(addRepair({ labor: 0 })).resolves.toBeTruthy();
  });

  it("refuse une garantie sans date de fin", async () => {
    await expect(addRepair({ underWarranty: true, endsAt: null })).rejects.toThrow();
    await expect(addRepair({ underWarranty: true, endsAt: "2027-03-01" })).resolves.toBeTruthy();
  });

  it("démarre à l'étape Reçu", async () => {
    const { id } = await addRepair();
    const [row] = await prisma.$queryRaw<{ status: string }[]>`SELECT status::text FROM repairs WHERE id = ${id}`;
    expect(row.status).toBe("received");
  });
});

describe("la table repair_parts", () => {
  it("refuse une quantité de 0 et de 101", async () => {
    const { id } = await addRepair();
    const partId = await addPart();
    await expect(addLine(id, partId, 0)).rejects.toThrow();
    await expect(addLine(id, partId, 101)).rejects.toThrow();
    await expect(addLine(id, partId, 2)).resolves.toBe(1);
  });

  it("garde une seule ligne par fiche et par pièce", async () => {
    const { id } = await addRepair();
    const partId = await addPart();
    await addLine(id, partId);
    await expect(addLine(id, partId)).rejects.toThrow();
  });

  it("refuse de supprimer une pièce utilisée par une fiche", async () => {
    const { id } = await addRepair();
    const partId = await addPart();
    await addLine(id, partId);
    await expect(prisma.$executeRaw`DELETE FROM parts WHERE id = ${partId}`).rejects.toThrow();
  });

  it("supprimer la fiche emporte ses lignes et ses étapes", async () => {
    const { id } = await addRepair();
    await addLine(id, await addPart());
    await prisma.$executeRaw`INSERT INTO repair_events (repair_id, status) VALUES (${id}, 'received'::"RepairStatus")`;
    await prisma.$executeRaw`DELETE FROM repairs WHERE id = ${id}`;
    const [lines] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM repair_parts`;
    const [events] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM repair_events`;
    expect([lines.n, events.n]).toEqual([0, 0]);
  });
});

describe("le lien avec la commande d'origine", () => {
  it("supprimer la commande garde la fiche, qui perd seulement son lien", async () => {
    const order = await prisma.order.create({
      data: {
        fullName: "Client",
        phone: "0550123456",
        type: "in_store", status: "picked_up", dailyNumber: 1,
        businessDate: new Date("2026-11-18"),
        subtotal: 80_000,
        shippingFee: 0,
        total: 80_000,
        items: { create: [{ sku: "IP13-128", name: "iPhone 13", unitPrice: 80_000, quantity: 1, warrantyMonths: 12 }] },
      },
      select: { number: true, items: { select: { id: true } } },
    });
    const itemId = order.items[0].id;
    const { id } = await addRepair();
    await prisma.$executeRaw`UPDATE repairs SET origin_item_id = ${itemId}, origin_order_number = ${order.number} WHERE id = ${id}`;

    await prisma.order.deleteMany();

    const [row] = await prisma.$queryRaw<{ origin_item_id: number | null; origin_order_number: number | null }[]>`
      SELECT origin_item_id, origin_order_number FROM repairs WHERE id = ${id}`;
    expect(row.origin_item_id).toBeNull();
    expect(row.origin_order_number).toBe(order.number);
  });
});

describe("le journal des pièces", () => {
  it("accepte les types repair et repair_return avec un repairId", async () => {
    const partId = await addPart();
    await expect(
      prisma.$executeRaw`INSERT INTO part_movements (part_id, kind, delta, stock_after, repair_id, note)
        VALUES (${partId}, 'repair'::"PartMovementKind", -1, 4, 7, 'R-1001')`,
    ).resolves.toBe(1);
    await expect(
      prisma.$executeRaw`INSERT INTO part_movements (part_id, kind, delta, stock_after, repair_id, note)
        VALUES (${partId}, 'repair_return'::"PartMovementKind", 1, 5, 7, 'R-1001')`,
    ).resolves.toBe(1);
  });
});
