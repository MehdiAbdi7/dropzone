import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { resetOrders } from "../src/scripts/lib/resetOrders.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";
import { adminAgent, device, openCash, setStatusOk, type Agent } from "./repairHelpers.js";

// Les points de la relecture du 19/11 sur le remplacement sous garantie : coût inconnu, article déjà remplacé, prix
// d'achat montré au technicien, stats, remise à zéro des commandes.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const variantStock = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  await prisma.productVariant.update({ where: { sku: "IP-R-DEAL" }, data: { purchasePrice: 120_000 } });
  await prisma.productVariant.update({ where: { sku: "CHG-20W" }, data: { purchasePrice: 1_000 } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
});
afterEach(() => vi.useRealTimers());

async function originalSale(paid: number) {
  const order = await prisma.order.create({
    data: {
      fullName: device.fullName,
      phone: device.phone,
      type: "in_store",
      status: "picked_up",
      dailyNumber: 1,
      businessDate: new Date("2026-03-01"),
      subtotal: paid,
      shippingFee: 0,
      total: paid,
      createdAt: at("2026-03-01T12:00"),
      items: { create: [{ productId: catalog.phone.id, sku: "IP-NEW-256", name: "iPhone 15 Pro Max", options: { Stockage: "256 Go" }, unitPrice: paid, quantity: 1, warrantyMonths: 12 }] },
    },
    select: { items: { select: { id: true } } },
  });
  return { itemId: order.items[0].id };
}

async function warrantyRepair(agent: Agent, itemId: number) {
  const response = await agent.post("/admin/repairs").send({ ...device, originItemId: itemId });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  await setStatusOk(agent, response.body.data.id, "in_repair");
  return response.body.data as { id: number };
}

const brokenPhone = () => ({
  deviceModelId: catalog.iphone.id,
  color: "Titane naturel",
  options: { Stockage: "256 Go" },
  grade: 4,
  batteryHealth: 80,
  replacedParts: [],
  compatibleParts: [],
  defects: ["Carte mère défaillante"],
  limitations: [],
  withBox: false,
  details: "Ne s'allume plus",
  warrantyMonths: 3,
  origin: "Europe",
});
const body = (sku: string) => ({ method: "cash", acceptLimitations: true, line: { sku }, tradeIn: brokenPhone() });
const replace = (agent: Agent, id: number, sku: string) => agent.post(`/admin/repairs/${id}/replace`).send(body(sku));
const detail = async (agent: Agent, id: number) => (await agent.get(`/admin/repairs/${id}`).expect(200)).body.data;

describe("relecture du remplacement", () => {
  it("refuse un appareil donné dont le prix d'achat est inconnu : le bénéfice serait faux", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: null } });
    const before = { orders: await prisma.order.count(), movements: await prisma.moneyMovement.count(), stock: await variantStock("IP-NEW-256") };
    const response = await replace(agent, repair.id, "IP-NEW-256");
    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("prix d'achat");
    expect({ orders: await prisma.order.count(), movements: await prisma.moneyMovement.count(), stock: await variantStock("IP-NEW-256") }).toEqual(before);
    expect((await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } })).status).toBe("in_repair");
  });

  it("l'article d'origine déjà remplacé ne se remplace plus et n'ouvre plus de fiche", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const first = await warrantyRepair(agent, sale.itemId);
    await replace(agent, first.id, "IP-NEW-256").expect(201);
    expect((await agent.post("/admin/repairs").send({ ...device, originItemId: sale.itemId })).status).toBe(400);
    // Une fiche ouverte avant le remplacement sur le même article : refusée au remplacement.
    const stray = await prisma.repair.create({
      data: { fullName: device.fullName, phone: device.phone, deviceName: "iPhone", issue: "Panne", underWarranty: true, warrantyEndsAt: new Date("2027-03-01T00:00:00Z"), status: "in_repair", originItemId: sale.itemId },
    });
    const before = await prisma.order.count();
    expect((await replace(agent, stray.id, "IP-NEW-256")).status).toBe(409);
    expect(await prisma.order.count()).toBe(before);
  });

  it("le technicien ne reçoit pas le prix d'achat de l'appareil donné d'une fiche remplacée", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    await replace(agent, repair.id, "IP-NEW-256").expect(201);
    const technician = (await loginAs("technician", "tech@test.dz")).agent;
    const asTechnician = await detail(technician, repair.id);
    expect(asTechnician.replacementOrderNumber).not.toBeNull();
    expect("partsCost" in asTechnician).toBe(false);
    expect((await detail(agent, repair.id)).partsCost).toBe(200_000);
  });

  it("la commande de remplacement n'entre ni dans les statuts ni dans les reconditionnés vendus de l'accueil", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const sale = await originalSale(150_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    const before = (await agent.get("/admin/stats").expect(200)).body.data;
    await replace(agent, repair.id, "IP-R-DEAL").expect(201);
    const after = (await agent.get("/admin/stats").expect(200)).body.data;
    expect(after.ordersByStatus).toEqual(before.ordersByStatus);
    expect(after.refurbishedSold).toBe(before.refurbishedSold);
  });

  it("la remise à zéro des commandes marche après un remplacement moins cher", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    await replace(agent, repair.id, "IP-R-DEAL").expect(201);
    expect((await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } })).paidAmount).toBe(-15_000);
    await expect(resetOrders(prisma, { keepStock: true })).resolves.toBeDefined();
    expect((await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } })).replacementOrderId).toBeNull();
  });
});
