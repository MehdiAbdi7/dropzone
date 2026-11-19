import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";
import { addLineOk, adminAgent, device, makePart, openCash, setStatusOk, stockOf as partStock, type Agent } from "./repairHelpers.js";

// Le remplacement sous garantie (atelier, étape 6, cahier §7) : l'appareil donné sort du stock, l'appareil en panne
// entre dans les Reprises à 0 DA, la garantie garde la date de fin de l'ancienne, et l'argent se range dans la fiche.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const variantStock = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  // Les prix d'achat : le neuf 200 000, l'affaire 120 000, le chargeur offert avec l'affaire 1 000.
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  await prisma.productVariant.update({ where: { sku: "IP-R-DEAL" }, data: { purchasePrice: 120_000 } });
  await prisma.productVariant.update({ where: { sku: "CHG-20W" }, data: { purchasePrice: 1_000 } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// Une vente d'origine remise au client le 01/03/2026 (12 mois : garantie jusqu'au 01/03/2027), payée `paid`.
async function originalSale(paid: number, storage: string | null = "256 Go") {
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
      items: {
        create: [
          {
            productId: catalog.phone.id,
            sku: "IP-NEW-256",
            name: "iPhone 15 Pro Max",
            options: storage ? { Stockage: storage } : {},
            unitPrice: paid,
            quantity: 1,
            warrantyMonths: 12,
          },
        ],
      },
    },
    select: { number: true, items: { select: { id: true } } },
  });
  return { orderNumber: order.number, itemId: order.items[0].id };
}

// Une fiche sous garantie, déjà « En réparation » (le technicien a vu que l'appareil est irréparable).
async function warrantyRepair(agent: Agent, itemId: number, status: "received" | "in_repair" = "in_repair") {
  const response = await agent.post("/admin/repairs").send({ ...device, originItemId: itemId });
  expect(response.status, JSON.stringify(response.body)).toBe(201);
  const repair = response.body.data as { id: number; underWarranty: boolean };
  expect(repair.underWarranty).toBe(true);
  if (status === "in_repair") await setStatusOk(agent, repair.id, "in_repair");
  return repair;
}

// L'appareil en panne que le client laisse : un iPhone 15 Pro Max en mauvais état (le prix de reprise n'existe pas ici).
const brokenPhone = (over: Record<string, unknown> = {}) => ({
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
  ...over,
});

const body = (sku: string, over: Record<string, unknown> = {}) => ({
  method: "cash",
  acceptLimitations: true,
  line: { sku },
  tradeIn: brokenPhone(),
  ...over,
});

const replace = (agent: Agent, repairId: number, payload: Record<string, unknown>) => agent.post(`/admin/repairs/${repairId}/replace`).send(payload);

describe("POST /admin/repairs/:id/replace", () => {
  it("même modèle : le client ne paie rien, la reprise est à 0 DA, la garantie garde sa date de fin", async () => {
    const agent = await adminAgent();
    // Payé 200 000 il y a huit mois : le catalogue dit 245 000 aujourd'hui, sans effet.
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    const stockBefore = await variantStock("IP-NEW-256");

    const response = await replace(agent, repair.id, body("IP-NEW-256"));
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data).toMatchObject({ difference: 0, costKnown: true });

    const fiche = await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } });
    expect(fiche).toMatchObject({ status: "returned", paidAmount: 0, partsCost: 200_000, payMethod: null });
    expect(fiche.replacementOrderId).not.toBeNull();
    expect(await variantStock("IP-NEW-256")).toBe(stockBefore - 1);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: fiche.replacementOrderId! }, include: { items: true, tradeIn: true } });
    expect(order).toMatchObject({ type: "exchange", status: "picked_up", fullName: device.fullName, phone: device.phone });
    expect(order.tradeIn).toMatchObject({ price: 0, repairCost: 0, color: "Titane naturel", deviceModelId: catalog.iphone.id, listedAt: null });
    // L'article donné garde le reste de l'ancienne garantie : 01/03/2027, et ses 12 mois pour rester retrouvable.
    expect(order.items[0]).toMatchObject({ sku: "IP-NEW-256", unitCost: 200_000, warrantyMonths: 12 });
    expect(order.items[0].warrantyUntil?.toISOString().slice(0, 10)).toBe("2027-03-01");

    // Un mouvement à 0 DA, lié à la fiche ET à la commande.
    const movements = await prisma.moneyMovement.findMany();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ kind: "exchange", orderType: "exchange", amount: 0, repairId: repair.id, orderId: order.id });
    // La fiche garde ses étapes : Reçu, En réparation, Rendu.
    const events = await prisma.repairEvent.findMany({ where: { repairId: repair.id }, orderBy: { id: "asc" } });
    expect(events.map((event) => event.status)).toEqual(["received", "in_repair", "returned"]);
  });

  it("autre modèle plus cher : le client paie la différence avec le prix PAYÉ, jamais avec le catalogue", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    // Payé 150 000 ; l'affaire coûte 185 000 aujourd'hui : le client paie 35 000.
    const sale = await originalSale(150_000);
    const repair = await warrantyRepair(agent, sale.itemId);

    const response = await replace(agent, repair.id, body("IP-R-DEAL"));
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data.difference).toBe(35_000);

    // Le coût de l'appareil donné : l'affaire 120 000 plus le chargeur offert 1 000.
    expect(await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } })).toMatchObject({ status: "returned", paidAmount: 35_000, partsCost: 121_000, payMethod: "cash" });
    expect(await prisma.moneyMovement.findFirstOrThrow()).toMatchObject({ amount: 35_000, method: "cash", repairId: repair.id, kind: "exchange" });
    expect((await agent.get("/admin/cash/today")).body.data.summary.cashIn).toBe(35_000);
  });

  it("autre modèle moins cher : le magasin rend la différence (mouvement négatif)", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    // Le client a payé 200 000 ; l'affaire vaut 185 000 : le magasin rend 15 000.
    const response = await replace(agent, repair.id, body("IP-R-DEAL"));
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data.difference).toBe(-15_000);
    expect(await prisma.moneyMovement.findFirstOrThrow()).toMatchObject({ amount: -15_000, repairId: repair.id });
  });

  it("un autre stockage n'est pas le même modèle : on compare avec le prix payé", async () => {
    const agent = await adminAgent();
    await openCash(agent);
    // L'origine était un 128 Go payé 150 000 ; on donne le 256 Go neuf à 245 000 : le client paie 95 000.
    const sale = await originalSale(150_000, "128 Go");
    const repair = await warrantyRepair(agent, sale.itemId);
    const response = await replace(agent, repair.id, body("IP-NEW-256"));
    expect(response.status, JSON.stringify(response.body)).toBe(201);
    expect(response.body.data.difference).toBe(95_000);
  });

  it("remplacé deux fois : la date de fin reste celle d'origine", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const first = await warrantyRepair(agent, sale.itemId);
    await replace(agent, first.id, body("IP-NEW-256")).expect(201);
    // Le client revient avec l'appareil de remplacement : sa garantie se retrouve par son téléphone.
    const hits = (await agent.get("/admin/repairs/warranty").query({ phone: device.phone }).expect(200)).body.data as { itemId: number; warrantyEndsAt: string }[];
    const replacement = hits.find((hit) => hit.itemId !== sale.itemId)!;
    expect(replacement.warrantyEndsAt).toBe("2027-03-01");

    const second = await warrantyRepair(agent, replacement.itemId);
    await replace(agent, second.id, body("IP-NEW-256")).expect(201);
    const items = await prisma.orderItem.findMany({ where: { warrantyUntil: { not: null } } });
    expect(items).toHaveLength(2);
    expect(items.every((item) => item.warrantyUntil?.toISOString().slice(0, 10) === "2027-03-01")).toBe(true);
  });

  it("depuis « Reçu » : le technicien voit tout de suite que c'est irréparable", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId, "received");
    await replace(agent, repair.id, body("IP-NEW-256")).expect(201);
    expect((await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } })).status).toBe("returned");
  });

  it("les pièces déjà sorties du stock pour la fiche y reviennent", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const part = await makePart("Écran iPhone 15", 5, 30_000, 45_000);
    const repair = await warrantyRepair(agent, sale.itemId, "received");
    await addLineOk(agent, repair.id, part.id, 2);
    await setStatusOk(agent, repair.id, "in_repair");
    expect(await partStock(part.id)).toBe(3);

    await replace(agent, repair.id, body("IP-NEW-256")).expect(201);
    expect(await partStock(part.id)).toBe(5);
    const returns = await prisma.partMovement.findMany({ where: { partId: part.id, kind: "repair_return" } });
    expect(returns).toHaveLength(1);
    expect(returns[0]).toMatchObject({ delta: 2, repairId: repair.id });
    // Elles n'ont rien coûté : l'appareil donné est le seul coût de la fiche.
    expect((await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } })).partsCost).toBe(200_000);
  });

  describe("refus : rien n'est écrit", () => {
    // L'état de la base qui ne doit pas bouger : commandes (la vente d'origine seulement), argent, stock, reprises.
    const snapshot = async () => ({
      orders: await prisma.order.count(),
      movements: await prisma.moneyMovement.count(),
      tradeIns: await prisma.tradeIn.count(),
      newStock: await variantStock("IP-NEW-256"),
      soldStock: await variantStock("IP-R-SOLD"),
    });

    it("un appareil hors garantie", async () => {
      const agent = await adminAgent();
      const repair = (await agent.post("/admin/repairs").send({ ...device, laborPrice: 1_000 }).expect(201)).body.data;
      const before = await snapshot();
      const response = await replace(agent, repair.id, body("IP-NEW-256"));
      expect(response.status).toBe(409);
      expect(await snapshot()).toEqual(before);
    });

    it("un appareil forcé hors garantie", async () => {
      const agent = await adminAgent();
      const sale = await originalSale(200_000);
      const repair = (await agent.post("/admin/repairs").send({ ...device, originItemId: sale.itemId, forceOutOfWarranty: true, laborPrice: 0 }).expect(201)).body.data;
      const before = await snapshot();
      expect((await replace(agent, repair.id, body("IP-NEW-256"))).status).toBe(409);
      expect(await snapshot()).toEqual(before);
    });

    it("une fiche déjà prête (Prêt) ou déjà rendue", async () => {
      const agent = await adminAgent();
      const sale = await originalSale(200_000);
      const repair = await warrantyRepair(agent, sale.itemId);
      await setStatusOk(agent, repair.id, "ready");
      const before = await snapshot();
      expect((await replace(agent, repair.id, body("IP-NEW-256"))).status).toBe(409);
      await setStatusOk(agent, repair.id, "returned");
      expect((await replace(agent, repair.id, body("IP-NEW-256"))).status).toBe(409);
      expect(await snapshot()).toEqual(before);
    });

    it("une fiche déjà remplacée", async () => {
      const agent = await adminAgent();
      const sale = await originalSale(200_000);
      const repair = await warrantyRepair(agent, sale.itemId);
      await replace(agent, repair.id, body("IP-NEW-256")).expect(201);
      const before = await snapshot();
      expect((await replace(agent, repair.id, body("IP-NEW-256"))).status).toBe(409);
      expect(await snapshot()).toEqual(before);
    });

    it("une commande d'origine supprimée : le prix payé est inconnu", async () => {
      const agent = await adminAgent();
      const sale = await originalSale(200_000);
      const repair = await warrantyRepair(agent, sale.itemId);
      await prisma.repair.update({ where: { id: repair.id }, data: { originItemId: null } });
      const before = await snapshot();
      expect((await replace(agent, repair.id, body("IP-NEW-256"))).status).toBe(400);
      expect(await snapshot()).toEqual(before);
    });

    it("un appareil donné épuisé", async () => {
      const agent = await adminAgent();
      const sale = await originalSale(200_000);
      const repair = await warrantyRepair(agent, sale.itemId);
      const before = await snapshot();
      const response = await replace(agent, repair.id, body("IP-R-SOLD"));
      expect(response.status).toBe(409);
      expect(await snapshot()).toEqual(before);
      expect((await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } })).status).toBe("in_repair");
    });

    it("de l'argent à encaisser sans caisse ouverte", async () => {
      const agent = await adminAgent();
      const sale = await originalSale(150_000);
      const repair = await warrantyRepair(agent, sale.itemId);
      const before = await snapshot();
      expect((await replace(agent, repair.id, body("IP-R-DEAL"))).status).toBe(409);
      expect(await snapshot()).toEqual(before);
    });

    it("une fiche inconnue", async () => {
      const agent = await adminAgent();
      expect((await replace(agent, 999_999, body("IP-NEW-256"))).status).toBe(404);
    });
  });

  it("deux envois en même temps : un seul remplacement", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    const stockBefore = await variantStock("IP-NEW-256");
    const results = await Promise.all([replace(agent, repair.id, body("IP-NEW-256")), replace(agent, repair.id, body("IP-NEW-256"))]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(await variantStock("IP-NEW-256")).toBe(stockBefore - 1);
    expect(await prisma.tradeIn.count()).toBe(1);
  });

  it("valide le corps : une reprise sans fiche d'état ou une ligne vide est refusée", async () => {
    const agent = await adminAgent();
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    expect((await replace(agent, repair.id, { ...body("IP-NEW-256"), tradeIn: { deviceModelId: catalog.iphone.id, color: "Noir" } })).status).toBe(400);
    expect((await replace(agent, repair.id, { ...body("IP-NEW-256"), line: {} })).status).toBe(400);
  });

  it("droits : le vendeur remplace, le technicien non", async () => {
    const admin = await adminAgent();
    const sale = await originalSale(200_000);
    const repair = await warrantyRepair(admin, sale.itemId);
    const technician = (await loginAs("technician", "tech@test.dz")).agent;
    expect((await replace(technician, repair.id, body("IP-NEW-256"))).status).toBe(403);
    const seller = (await loginAs("seller", "vendeur@test.dz")).agent;
    expect((await replace(seller, repair.id, body("IP-NEW-256"))).status).toBe(201);
  });
});

// Après le remplacement : la commande liée n'est ni une vente ni un échange comme les autres.
describe("une fiche remplacée", () => {
  // Payé 150 000, donné l'affaire à 185 000 (acheté 120 000, chargeur offert 1 000) : le client paie 35 000 et le
  // bénéfice est 35 000 − 121 000 = −86 000.
  async function replacedRepair() {
    const agent = await adminAgent();
    await openCash(agent);
    const sale = await originalSale(150_000);
    const repair = await warrantyRepair(agent, sale.itemId);
    await replace(agent, repair.id, body("IP-R-DEAL")).expect(201);
    const fiche = await prisma.repair.findUniqueOrThrow({ where: { id: repair.id } });
    return { agent, repairId: repair.id, number: fiche.number, orderId: fiche.replacementOrderId! };
  }
  const history = (agent: Agent, type?: string) =>
    agent.get("/admin/history").query({ from: "2026-11-16", to: "2026-11-16", ...(type ? { type } : {}) }).expect(200).then((response) => response.body.data);

  it("l'Historique range l'argent et le bénéfice sous Réparations, une seule fois", async () => {
    const { agent, number } = await replacedRepair();
    const repairs = await history(agent, "repair");
    expect(repairs.repairs).toHaveLength(1);
    expect(repairs.repairs[0]).toMatchObject({ number, underWarranty: true, paidAmount: 35_000, partsCost: 121_000, profit: -86_000, replacement: true });
    expect(repairs.totals).toMatchObject({ collected: 35_000, profit: -86_000, salesCount: 1 });

    // Le Total compte l'argent une fois et le bénéfice une fois (pas aussi « prix de l'article − son coût »).
    const total = await history(agent);
    expect(total.totals).toMatchObject({ collected: 35_000, profit: -86_000 });
    expect(total.channels.repair).toMatchObject({ salesCount: 1, profit: -86_000, collected: 35_000 });
    expect(total.channels.exchange).toMatchObject({ salesCount: 0, profit: 0, collected: 0 });
    // La commande n'apparaît dans aucune liste de commandes de l'Historique.
    expect(total.orders.map((order: { type: string }) => order.type)).not.toContain("exchange");
    expect((await history(agent, "exchange")).orders).toEqual([]);
  });

  it("n'apparaît pas dans la liste des commandes, ni dans les ventes du jour de l'accueil", async () => {
    const { agent, orderId } = await replacedRepair();
    const list = (await agent.get("/admin/orders").expect(200)).body.data as { id: number }[];
    expect(list.map((order) => order.id)).not.toContain(orderId);
    const stats = (await agent.get("/admin/stats").expect(200)).body.data;
    // Le remplacement n'est pas une vente du jour : ni son chiffre d'affaires, ni son compte.
    expect(stats.revenueToday).toBe(0);
    expect(stats.ordersToday).toBe(0);
  });

  it("la commande ne se modifie, ne se supprime ni ne se facture depuis les commandes", async () => {
    const { agent, orderId, number } = await replacedRepair();
    const edit = await agent.patch(`/admin/orders/${orderId}`).send({ lines: [{ sku: "IP-R-DEAL", quantity: 1, unitPrice: 185_000 }] });
    expect(edit.status).toBe(409);
    expect(edit.body.error.message).toContain(`R-${number}`);
    const del = await agent.delete(`/admin/orders/${orderId}`);
    expect(del.status).toBe(409);
    expect(del.body.error.message).toContain(`R-${number}`);
    expect((await agent.post(`/admin/orders/${orderId}/invoice`)).status).toBe(409);
    expect(await prisma.order.findUnique({ where: { id: orderId } })).not.toBeNull();
  });

  it("la fiche ne se supprime pas : le remplacement a déjà sorti un appareil du stock", async () => {
    const { agent, repairId } = await replacedRepair();
    const stock = await variantStock("IP-R-DEAL");
    const response = await agent.delete(`/admin/repairs/${repairId}`);
    expect(response.status).toBe(409);
    expect(await variantStock("IP-R-DEAL")).toBe(stock);
    expect(await prisma.repair.findUnique({ where: { id: repairId } })).not.toBeNull();
  });
});
