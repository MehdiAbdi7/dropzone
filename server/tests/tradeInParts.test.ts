import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";
import { adminAgent, makePart, stockOf, type Agent } from "./repairHelpers.js";

// Les pièces d'une reprise (atelier, étape 6, cahier §8) : démonter une reprise à 0 DA pour récupérer des pièces, ou
// utiliser des pièces du stock pour remettre une reprise en état.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let dailyNumber = 0;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  dailyNumber = 0;
});

// Une reprise (avec sa commande d'échange) : à 0 DA par défaut, comme celle d'un remplacement sous garantie.
async function tradeInRow(over: { price?: number; repairCost?: number; listedAt?: Date | null; linked?: boolean } = {}) {
  dailyNumber += 1;
  const order = await prisma.order.create({
    data: {
      fullName: "Karim Benali",
      phone: "0550123456",
      type: "exchange",
      status: "picked_up",
      dailyNumber,
      businessDate: new Date("2026-11-16"),
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      tradeIn: {
        create: { deviceModelId: catalog.iphone.id, color: "Titane naturel", price: over.price ?? 0, repairCost: over.repairCost ?? 0, listedAt: over.listedAt ?? null, sheet: {} },
      },
    },
    select: { id: true, tradeIn: { select: { id: true } } },
  });
  // Par défaut, la reprise vient d'un remplacement sous garantie (une fiche lui est liée) : seule celle-là se démonte.
  if (over.linked !== false) {
    await prisma.repair.create({
      data: {
        fullName: "Karim Benali",
        phone: "0550123456",
        deviceName: "iPhone 15 Pro Max",
        issue: "Ne s'allume plus",
        underWarranty: true,
        warrantyEndsAt: new Date("2027-03-01T00:00:00Z"),
        status: "returned",
        returnedOn: new Date("2026-11-16T00:00:00Z"),
        paidAmount: 0,
        partsCost: 0,
        replacementOrderId: order.id,
      },
    });
  }
  return { orderId: order.id, id: order.tradeIn!.id };
}

const dismantle = (agent: Agent, id: number, parts: { partId: number; quantity: number }[]) => agent.post(`/admin/trade-ins/${id}/dismantle`).send({ parts });
const usePart = (agent: Agent, id: number, partId: number, quantity: number) => agent.post(`/admin/trade-ins/${id}/parts`).send({ partId, quantity });
const partRow = (id: number) => prisma.part.findUniqueOrThrow({ where: { id } });

describe("POST /admin/trade-ins/:id/dismantle", () => {
  it("les pièces entrent au stock à 0 DA, le prix d'achat devient la moyenne, la reprise disparaît", async () => {
    const agent = await adminAgent();
    const battery = await makePart("Batterie iPhone 13", 2, 3_500, 6_000);
    const camera = await makePart("Caméra iPhone 13", 0, 9_999, 12_000);
    const reprise = await tradeInRow();

    const response = await dismantle(agent, reprise.id, [
      { partId: battery.id, quantity: 2 },
      { partId: camera.id, quantity: 1 },
    ]);
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body.data).toEqual({ id: reprise.id, added: 3 });

    // 2 à 3 500 plus 2 à 0 : prix d'achat 1 750. Sans stock, le prix devient celui de l'arrivage : 0.
    expect(await partRow(battery.id)).toMatchObject({ stock: 4, purchasePrice: 1_750 });
    expect(await partRow(camera.id)).toMatchObject({ stock: 1, purchasePrice: 0 });
    const movements = await prisma.partMovement.findMany({ where: { kind: "salvage" }, orderBy: { id: "asc" } });
    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({ partId: battery.id, delta: 2, unitCost: 0, stockAfter: 4, tradeInId: reprise.id });
    expect(movements[0].note).toContain("Démontage");

    expect(await prisma.tradeIn.findUnique({ where: { id: reprise.id } })).toBeNull();
    // La commande de l'échange reste : seule la reprise disparaît.
    expect(await prisma.order.findUnique({ where: { id: reprise.orderId } })).not.toBeNull();
  });

  describe("refus : rien n'est écrit", () => {
    it("une reprise payée au client", async () => {
      const agent = await adminAgent();
      const part = await makePart("Batterie iPhone 13", 2);
      const reprise = await tradeInRow({ price: 150_000 });
      expect((await dismantle(agent, reprise.id, [{ partId: part.id, quantity: 1 }])).status).toBe(409);
      expect(await stockOf(part.id)).toBe(2);
      expect(await prisma.tradeIn.count()).toBe(1);
    });

    it("une reprise à 0 DA qui ne vient pas d'un remplacement sous garantie", async () => {
      const agent = await adminAgent();
      const part = await makePart("Batterie iPhone 13", 2);
      const reprise = await tradeInRow({ linked: false });
      expect((await dismantle(agent, reprise.id, [{ partId: part.id, quantity: 1 }])).status).toBe(409);
      expect(await stockOf(part.id)).toBe(2);
      expect(await prisma.tradeIn.count()).toBe(1);
    });

    it("une reprise déjà remise en état (frais saisis)", async () => {
      const agent = await adminAgent();
      const part = await makePart("Batterie iPhone 13", 2);
      const reprise = await tradeInRow({ repairCost: 3_000 });
      expect((await dismantle(agent, reprise.id, [{ partId: part.id, quantity: 1 }])).status).toBe(409);
      expect(await stockOf(part.id)).toBe(2);
    });

    it("une reprise déjà en vente", async () => {
      const agent = await adminAgent();
      const part = await makePart("Batterie iPhone 13", 2);
      const reprise = await tradeInRow({ listedAt: new Date() });
      expect((await dismantle(agent, reprise.id, [{ partId: part.id, quantity: 1 }])).status).toBe(409);
      expect(await stockOf(part.id)).toBe(2);
    });

    it("une pièce inconnue : les autres pièces ne bougent pas non plus", async () => {
      const agent = await adminAgent();
      const part = await makePart("Batterie iPhone 13", 2);
      const reprise = await tradeInRow();
      const response = await dismantle(agent, reprise.id, [
        { partId: part.id, quantity: 1 },
        { partId: 999_999, quantity: 1 },
      ]);
      expect(response.status).toBe(404);
      expect(await stockOf(part.id)).toBe(2);
      expect(await prisma.partMovement.count()).toBe(0);
      expect(await prisma.tradeIn.count()).toBe(1);
    });

    it("une reprise inconnue", async () => {
      const agent = await adminAgent();
      const part = await makePart("Batterie iPhone 13", 2);
      expect((await dismantle(agent, 999_999, [{ partId: part.id, quantity: 1 }])).status).toBe(404);
    });

    it("un corps invalide : aucune pièce, quantité 0, même pièce deux fois", async () => {
      const agent = await adminAgent();
      const part = await makePart("Batterie iPhone 13", 2);
      const reprise = await tradeInRow();
      expect((await dismantle(agent, reprise.id, [])).status).toBe(400);
      expect((await dismantle(agent, reprise.id, [{ partId: part.id, quantity: 0 }])).status).toBe(400);
      expect(
        (
          await dismantle(agent, reprise.id, [
            { partId: part.id, quantity: 1 },
            { partId: part.id, quantity: 1 },
          ])
        ).status,
      ).toBe(400);
      expect(await stockOf(part.id)).toBe(2);
    });
  });

  it("deux démontages en même temps : un seul passe, le stock n'est pas doublé", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 2);
    const reprise = await tradeInRow();
    const results = await Promise.all([dismantle(agent, reprise.id, [{ partId: part.id, quantity: 1 }]), dismantle(agent, reprise.id, [{ partId: part.id, quantity: 1 }])]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 404]);
    expect(await stockOf(part.id)).toBe(3);
  });

  it("réservé à l'admin", async () => {
    const part = await makePart("Batterie iPhone 13", 2);
    const reprise = await tradeInRow();
    const seller = (await loginAs("seller", "vendeur@test.dz")).agent;
    expect((await dismantle(seller, reprise.id, [{ partId: part.id, quantity: 1 }])).status).toBe(403);
    const technician = (await loginAs("technician", "tech@test.dz")).agent;
    expect((await dismantle(technician, reprise.id, [{ partId: part.id, quantity: 1 }])).status).toBe(403);
  });
});

describe("POST /admin/trade-ins/:id/parts", () => {
  it("la pièce sort du stock et son prix d'achat s'ajoute aux frais de remise en état", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5, 3_500, 6_000);
    const reprise = await tradeInRow({ price: 150_000 });

    const first = await usePart(agent, reprise.id, part.id, 2);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body.data).toEqual({ id: reprise.id, repairCost: 7_000 });
    expect(await stockOf(part.id)).toBe(3);
    const movement = await prisma.partMovement.findFirstOrThrow({ where: { kind: "trade_in_use" } });
    expect(movement).toMatchObject({ partId: part.id, delta: -2, stockAfter: 3, tradeInId: reprise.id });

    // Un deuxième emploi s'ajoute au premier.
    expect((await usePart(agent, reprise.id, part.id, 1)).body.data.repairCost).toBe(10_500);
    expect((await prisma.tradeIn.findUniqueOrThrow({ where: { id: reprise.id } })).repairCost).toBe(10_500);
  });

  it("un stock insuffisant nomme la pièce et n'écrit rien", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 1);
    const reprise = await tradeInRow({ price: 150_000 });
    const response = await usePart(agent, reprise.id, part.id, 2);
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("Batterie iPhone 13");
    expect(await stockOf(part.id)).toBe(1);
    expect((await prisma.tradeIn.findUniqueOrThrow({ where: { id: reprise.id } })).repairCost).toBe(0);
    expect(await prisma.partMovement.count()).toBe(0);
  });

  it("refuse une reprise déjà en vente, une reprise ou une pièce inconnue, une quantité invalide", async () => {
    const agent = await adminAgent();
    const part = await makePart("Batterie iPhone 13", 5);
    const listed = await tradeInRow({ listedAt: new Date() });
    expect((await usePart(agent, listed.id, part.id, 1)).status).toBe(409);
    const reprise = await tradeInRow({ price: 150_000 });
    expect((await usePart(agent, 999_999, part.id, 1)).status).toBe(404);
    expect((await usePart(agent, reprise.id, 999_999, 1)).status).toBe(404);
    expect((await usePart(agent, reprise.id, part.id, 0)).status).toBe(400);
    expect(await stockOf(part.id)).toBe(5);
  });

  it("réservé à l'admin", async () => {
    const part = await makePart("Batterie iPhone 13", 5);
    const reprise = await tradeInRow({ price: 150_000 });
    const seller = (await loginAs("seller", "vendeur@test.dz")).agent;
    expect((await usePart(seller, reprise.id, part.id, 1)).status).toBe(403);
  });
});

describe("GET /admin/trade-ins", () => {
  it("dit d'où vient une reprise (la réparation R-…) et si elle se démonte", async () => {
    const agent = await adminAgent();
    const plain = await tradeInRow({ price: 150_000, linked: false });
    const free = await tradeInRow({ linked: false });
    const unlinkedFree = await tradeInRow({ linked: false });
    const repair = await prisma.repair.create({
      data: {
        fullName: "Karim Benali",
        phone: "0550123456",
        deviceName: "iPhone 15 Pro Max",
        issue: "Ne s'allume plus",
        underWarranty: true,
        warrantyEndsAt: new Date("2027-03-01T00:00:00Z"),
        status: "returned",
        returnedOn: new Date("2026-11-16T00:00:00Z"),
        paidAmount: 0,
        partsCost: 0,
        replacementOrderId: free.orderId,
      },
    });

    const rows = (await agent.get("/admin/trade-ins").expect(200)).body.data as { id: number; repairNumber: number | null; dismantlable: boolean }[];
    expect(rows.find((row) => row.id === plain.id)).toMatchObject({ repairNumber: null, dismantlable: false });
    // À 0 DA mais sans fiche : pas démontable (seul un remplacement sous garantie l'est).
    expect(rows.find((row) => row.id === unlinkedFree.id)).toMatchObject({ repairNumber: null, dismantlable: false });
    expect(rows.find((row) => row.id === free.id)).toMatchObject({ repairNumber: repair.number, dismantlable: true });

    // Remise en état commencée : on ne la démonte plus.
    await prisma.tradeIn.update({ where: { id: free.id }, data: { repairCost: 2_000 } });
    const after = (await agent.get("/admin/trade-ins").expect(200)).body.data as { id: number; dismantlable: boolean }[];
    expect(after.find((row) => row.id === free.id)!.dismantlable).toBe(false);
  });
});
