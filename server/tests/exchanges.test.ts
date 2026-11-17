import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Les échanges (lot 5, 15/11) : le client rend un téléphone (la reprise, au prix que le magasin choisit
// à la main) et en prend un autre. La reprise attend dans `trade_ins` jusqu'à sa mise en vente.
const at = (algiers: string) => new Date(`${algiers}+01:00`);
const stockOf = async (sku: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

// Un vendeur connecté, caisse ouverte avec 10 000 DA de fond.
async function counter() {
  const admin = await loginAs("admin");
  await admin.agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  return admin;
}

// Le téléphone du client : un iPhone 15 Pro Max en bon état, repris 150 000 DA.
const tradeIn = (over: Record<string, unknown> = {}) => ({
  deviceModelId: catalog.iphone.id,
  color: "Titane naturel",
  price: 150_000,
  options: { Stockage: "256 Go" },
  grade: 8,
  batteryHealth: 88,
  replacedParts: [],
  compatibleParts: [],
  defects: ["Rayure légère au dos"],
  limitations: [],
  withBox: false,
  details: "Rendu avec son chargeur",
  warrantyMonths: 3,
  origin: "Europe",
  ...over,
});

const exchange = (over: Record<string, unknown> = {}) => ({
  fullName: "Amine Test",
  phone: "0555 12 34 56",
  method: "cash",
  lines: [{ sku: "IP-NEW-256", quantity: 1 }],
  tradeIn: tradeIn(),
  ...over,
});

describe("POST /admin/exchanges", () => {
  it("le client complète : l'argent entre dans la caisse, la reprise attend hors du catalogue", async () => {
    const { agent, user } = await counter();
    const before = await stockOf("IP-NEW-256");
    const response = await agent.post("/admin/exchanges").send(exchange());
    expect(response.status).toBe(201);
    // 245 000 (donné) − 150 000 (repris) = 95 000 payés par le client.
    expect(response.body.data).toMatchObject({ dailyNumber: 1, total: 245_000, difference: 95_000, status: "picked_up" });

    const order = await prisma.order.findFirstOrThrow({ include: { items: true, tradeIn: true } });
    expect(order).toMatchObject({ type: "exchange", status: "picked_up", total: 245_000, shippingFee: 0, wilaya: null });
    expect(order.items[0]).toMatchObject({ sku: "IP-NEW-256", unitPrice: 245_000, unitCost: 200_000 });
    expect(order.tradeIn).toMatchObject({ price: 150_000, color: "Titane naturel", deviceModelId: catalog.iphone.id, listedAt: null });
    expect(await stockOf("IP-NEW-256")).toBe(before - 1);

    const movements = await prisma.moneyMovement.findMany();
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({ kind: "exchange", method: "cash", amount: 95_000, orderType: "exchange", orderId: order.id, userId: user.id });
    expect((await agent.get("/admin/cash/today")).body.data.summary.cashIn).toBe(95_000);
  });

  it("le magasin rend de l'argent quand la reprise vaut plus que le téléphone donné", async () => {
    const { agent } = await counter();
    // Le client rend un téléphone repris 200 000 contre une affaire à 185 000.
    const response = await agent.post("/admin/exchanges").send(exchange({ lines: [{ sku: "IP-R-DEAL", quantity: 1 }], tradeIn: tradeIn({ price: 200_000 }) }));
    expect(response.status).toBe(201);
    expect(response.body.data.difference).toBe(-15_000);
    expect((await prisma.moneyMovement.findFirstOrThrow()).amount).toBe(-15_000);
    expect((await agent.get("/admin/cash/today")).body.data.summary.cashIn).toBe(-15_000);
  });

  it("une différence nulle écrit quand même le mouvement à 0 DA", async () => {
    const { agent } = await counter();
    const response = await agent.post("/admin/exchanges").send(exchange({ tradeIn: tradeIn({ price: 245_000 }) }));
    expect(response.status).toBe(201);
    expect(response.body.data.difference).toBe(0);
    expect(await prisma.moneyMovement.count({ where: { kind: "exchange", amount: 0 } })).toBe(1);
  });

  it("applique le prix négocié du téléphone donné", async () => {
    const { agent, user } = await counter();
    const response = await agent.post("/admin/exchanges").send(exchange({ lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 240_000 }] }));
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ total: 240_000, difference: 90_000 });
    expect(await prisma.orderItem.findFirstOrThrow()).toMatchObject({ unitPrice: 240_000, listPrice: 245_000, grantedById: user.id });
  });

  it("refuse sans journée de caisse ouverte, rien n'est écrit", async () => {
    const { agent } = await loginAs("admin");
    const before = await stockOf("IP-NEW-256");
    const response = await agent.post("/admin/exchanges").send(exchange());
    expect(response.status).toBe(409);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.tradeIn.count()).toBe(0);
    expect(await stockOf("IP-NEW-256")).toBe(before);
  });

  it("refuse un modèle repris qui n'a ni fiche ni série (l'affaire ne pourrait pas être publiée)", async () => {
    const { agent } = await counter();
    const response = await agent.post("/admin/exchanges").send(exchange({ tradeIn: tradeIn({ deviceModelId: catalog.galaxy.id }) }));
    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/série/);
    expect(await prisma.order.count()).toBe(0);
  });

  it("refuse un modèle inconnu", async () => {
    const { agent } = await counter();
    const response = await agent.post("/admin/exchanges").send(exchange({ tradeIn: tradeIn({ deviceModelId: 99999 }) }));
    expect(response.status).toBe(400);
  });

  it("exige la fiche d'état : la boîte et la garantie", async () => {
    const { agent } = await counter();
    expect((await agent.post("/admin/exchanges").send(exchange({ tradeIn: tradeIn({ withBox: null }) }))).status).toBe(400);
    expect((await agent.post("/admin/exchanges").send(exchange({ tradeIn: tradeIn({ warrantyMonths: null }) }))).status).toBe(400);
    expect((await agent.post("/admin/exchanges").send(exchange({ tradeIn: tradeIn({ compatibleParts: ["Écran"] }) }))).status).toBe(400);
  });

  it("le prix de reprise est un nombre de dinars entier, saisi par le magasin", async () => {
    const { agent } = await counter();
    for (const price of [-1, 1.5, "cent", null]) {
      expect((await agent.post("/admin/exchanges").send(exchange({ tradeIn: tradeIn({ price }) }))).status).toBe(400);
    }
    expect((await agent.post("/admin/exchanges").send(exchange({ tradeIn: { ...tradeIn(), price: undefined } }))).status).toBe(400);
  });

  it("annule tout quand le stock vient de manquer", async () => {
    const { agent } = await counter();
    const response = await agent.post("/admin/exchanges").send(exchange({ lines: [{ sku: "IP-R-SOLD", quantity: 1 }] }));
    expect(response.status).toBe(409);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.tradeIn.count()).toBe(0);
    expect(await prisma.moneyMovement.count()).toBe(0);
  });

  it("refuse sans être administrateur", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.post("/admin/exchanges").send(exchange())).status).toBe(403);
  });
});

describe("Les reprises à mettre en vente", () => {
  const makeExchange = async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);
    return agent;
  };

  it("liste les reprises en attente, jamais celles déjà en vente", async () => {
    const agent = await makeExchange();
    const list = await agent.get("/admin/trade-ins");
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      color: "Titane naturel",
      price: 150_000,
      customerName: "Amine Test",
      deviceModel: { name: "iPhone 15 Pro Max" },
      listedAt: null,
    });
    expect(list.body.data[0].sheet).toMatchObject({ grade: 8, batteryHealth: 88, withBox: false });

    await agent.post(`/admin/trade-ins/${list.body.data[0].id}/publish`).send({ price: 175_000 }).expect(201);
    expect((await agent.get("/admin/trade-ins")).body.data).toHaveLength(0);
    expect((await agent.get("/admin/trade-ins?status=listed")).body.data).toHaveLength(1);
  });

  it("ne vend rien tant qu'elle n'est pas publiée : le catalogue n'a pas de nouvelle variante", async () => {
    await makeExchange();
    expect(await prisma.productVariant.count({ where: { sku: { startsWith: "REP-" } } })).toBe(0);
  });

  it("la mise en vente crée l'affaire dans la fiche du modèle, au prix de revente, prix d'achat = prix de reprise", async () => {
    const agent = await makeExchange();
    const [pending] = (await agent.get("/admin/trade-ins")).body.data;
    const response = await agent.post(`/admin/trade-ins/${pending.id}/publish`).send({ price: 175_000 });
    expect(response.status).toBe(201);

    const variant = await prisma.productVariant.findFirstOrThrow({ where: { sku: `REP-${pending.id}` }, include: { product: true } });
    expect(variant).toMatchObject({
      condition: "refurbished",
      price: 175_000,
      purchasePrice: 150_000,
      stock: 1,
      grade: 8,
      batteryHealth: 88,
      withBox: false,
      warrantyMonths: 3,
      origin: "Europe",
      defects: ["Rayure légère au dos"],
    });
    expect(variant.options).toMatchObject({ Stockage: "256 Go", Couleur: "Titane naturel" });
    // Dans la fiche existante du modèle, pas dans une nouvelle.
    expect(variant.productId).toBe(catalog.phone.id);
    const saved = await prisma.tradeIn.findUniqueOrThrow({ where: { id: pending.id } });
    expect(saved.listedAt).not.toBeNull();
    expect(saved.listedVariantId).toBe(variant.id);
  });

  it("refuse de publier deux fois la même reprise", async () => {
    const agent = await makeExchange();
    const [pending] = (await agent.get("/admin/trade-ins")).body.data;
    await agent.post(`/admin/trade-ins/${pending.id}/publish`).send({ price: 175_000 }).expect(201);
    const again = await agent.post(`/admin/trade-ins/${pending.id}/publish`).send({ price: 180_000 });
    expect(again.status).toBe(409);
    expect(await prisma.productVariant.count({ where: { sku: { startsWith: "REP-" } } })).toBe(1);
  });

  it("exige un prix de revente entier", async () => {
    const agent = await makeExchange();
    const [pending] = (await agent.get("/admin/trade-ins")).body.data;
    for (const body of [{}, { price: -5 }, { price: 1.5 }, { price: "x" }]) {
      expect((await agent.post(`/admin/trade-ins/${pending.id}/publish`).send(body)).status).toBe(400);
    }
  });

  it("une reprise inconnue : 404", async () => {
    const { agent } = await counter();
    expect((await agent.post("/admin/trade-ins/99999/publish").send({ price: 1000 })).status).toBe(404);
  });
});

describe("Le détail d'un échange", () => {
  it("dit le téléphone repris, son prix et s'il est déjà en vente", async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);
    const order = await prisma.order.findFirstOrThrow();

    const detail = (await agent.get(`/admin/orders/${order.id}`)).body.data;
    expect(detail.type).toBe("exchange");
    expect(detail.tradeIn).toMatchObject({ price: 150_000, color: "Titane naturel", listedAt: null, deviceModel: { name: "iPhone 15 Pro Max" } });
    expect(detail.paid).toBe(95_000);
  });

  it("une vente ordinaire n'a pas de téléphone repris", async () => {
    const { agent } = await counter();
    await agent.post("/admin/sales").send({ fullName: "Amine Test", phone: "0555 12 34 56", method: "cash", lines: [{ sku: "IP-NEW-256", quantity: 1 }] }).expect(201);
    const order = await prisma.order.findFirstOrThrow();
    expect((await agent.get(`/admin/orders/${order.id}`)).body.data.tradeIn).toBeNull();
  });
});

describe("Supprimer ou modifier un échange", () => {
  it("la suppression remet le stock, rend la différence et retire la reprise", async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);
    const order = await prisma.order.findFirstOrThrow();
    const stock = await stockOf("IP-NEW-256");

    const response = await agent.delete(`/admin/orders/${order.id}`);
    expect(response.status).toBe(200);
    expect(await stockOf("IP-NEW-256")).toBe(stock + 1);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.tradeIn.count()).toBe(0);
    const net = await prisma.moneyMovement.aggregate({ _sum: { amount: true }, where: { orderId: order.id } });
    expect(net._sum.amount).toBe(0);
    expect(await prisma.moneyMovement.count({ where: { kind: "correction", amount: -95_000, orderType: "exchange" } })).toBe(1);
  });

  it("la suppression rend au magasin l'argent qu'il avait rendu au client", async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange({ lines: [{ sku: "IP-R-DEAL", quantity: 1 }], tradeIn: tradeIn({ price: 200_000 }) })).expect(201);
    const order = await prisma.order.findFirstOrThrow();
    await agent.delete(`/admin/orders/${order.id}`).expect(200);
    // Le magasin avait rendu 15 000 : la correction les remet dans le tiroir.
    expect(await prisma.moneyMovement.count({ where: { kind: "correction", amount: 15_000 } })).toBe(1);
  });

  it("refuse de supprimer un échange dont la reprise est déjà en vente, rien ne change", async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);
    const order = await prisma.order.findFirstOrThrow();
    const [pending] = (await agent.get("/admin/trade-ins")).body.data;
    await agent.post(`/admin/trade-ins/${pending.id}/publish`).send({ price: 175_000 }).expect(201);
    const stock = await stockOf("IP-NEW-256");

    const response = await agent.delete(`/admin/orders/${order.id}`);
    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/en vente/);
    expect(await prisma.order.count()).toBe(1);
    expect(await stockOf("IP-NEW-256")).toBe(stock);
    expect(await prisma.moneyMovement.count({ where: { kind: "correction" } })).toBe(0);
  });

  it("refuse de modifier un échange", async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);
    const order = await prisma.order.findFirstOrThrow({ include: { items: true } });
    const response = await agent.patch(`/admin/orders/${order.id}`).send({ lines: [{ id: order.items[0].id, quantity: 1, unitPrice: 200_000 }] });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/échange/);
  });
});

describe("L'échange dans l'historique", () => {
  const range = "from=2026-11-16&to=2026-11-16";

  it("a son canal, son onglet, et compte comme une vente avec son bénéfice", async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);

    const total = (await agent.get(`/admin/history?${range}`)).body.data;
    // L'argent du jour : la différence payée, pas le prix du téléphone donné.
    expect(total.channels.exchange).toMatchObject({ collected: 95_000, salesCount: 1, profit: 45_000 });
    expect(total.totals).toMatchObject({ collected: 95_000, salesCount: 1, profit: 45_000 });
    expect(total.totals.byKind.exchange).toBe(95_000);
    expect(total.orders).toHaveLength(1);
    expect(total.orders[0]).toMatchObject({ type: "exchange", total: 245_000, paid: 95_000 });

    const tab = (await agent.get(`/admin/history?${range}&type=exchange`)).body.data;
    expect(tab.orders).toHaveLength(1);
    expect(tab.totals).toMatchObject({ collected: 95_000, salesCount: 1 });

    const store = (await agent.get(`/admin/history?${range}&type=in_store`)).body.data;
    expect(store.orders).toHaveLength(0);
    expect(store.totals).toMatchObject({ collected: 0, salesCount: 0 });
  });

  it("l'écart de caisse compte l'échange comme du tiroir", async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);
    // Fond 10 000 + 95 000 d'espèces d'échange = 105 000 attendus.
    await agent.post("/admin/cash/close").send({ countedCash: 105_000 }).expect(200);
    const history = (await agent.get(`/admin/history?${range}`)).body.data;
    expect(history.days[0].cashDay).toMatchObject({ gap: 0, closed: true });
  });
});

// Modifier une reprise avant sa mise en vente (18/11) : le téléphone a été remis en état (batterie neuve), la fiche
// doit le dire, et ce que la remise en état a coûté s'ajoute au prix d'achat de l'affaire.
describe("PATCH /admin/trade-ins/:id", () => {
  const makeExchange = async () => {
    const { agent } = await counter();
    await agent.post("/admin/exchanges").send(exchange()).expect(201);
    return agent;
  };
  const sheetOf = (over: Record<string, unknown> = {}) => {
    const { deviceModelId: _model, price: _price, ...sheet } = tradeIn();
    return { ...sheet, repairCost: 0, ...over };
  };

  it("change la fiche (batterie remplacée) et les frais, sans toucher au prix de reprise", async () => {
    const agent = await makeExchange();
    const [pending] = (await agent.get("/admin/trade-ins")).body.data;
    const response = await agent
      .patch(`/admin/trade-ins/${pending.id}`)
      .send(sheetOf({ batteryHealth: 100, replacedParts: ["Batterie"], compatibleParts: ["Batterie"], repairCost: 8_000 }));
    expect(response.status).toBe(200);
    const saved = await prisma.tradeIn.findUniqueOrThrow({ where: { id: pending.id } });
    expect(saved).toMatchObject({ price: 150_000, repairCost: 8_000 });
    expect(saved.sheet).toMatchObject({ batteryHealth: 100, replacedParts: ["Batterie"], compatibleParts: ["Batterie"] });
    const [after] = (await agent.get("/admin/trade-ins")).body.data;
    expect(after).toMatchObject({ repairCost: 8_000, price: 150_000 });
  });

  it("la mise en vente prend la fiche modifiée, et le prix d'achat = reprise + remise en état", async () => {
    const agent = await makeExchange();
    const [pending] = (await agent.get("/admin/trade-ins")).body.data;
    await agent
      .patch(`/admin/trade-ins/${pending.id}`)
      .send(sheetOf({ batteryHealth: 100, replacedParts: ["Batterie"], compatibleParts: [], repairCost: 8_000 }))
      .expect(200);
    await agent.post(`/admin/trade-ins/${pending.id}/publish`).send({ price: 175_000 }).expect(201);
    const variant = await prisma.productVariant.findFirstOrThrow({ where: { sku: `REP-${pending.id}` } });
    expect(variant).toMatchObject({ batteryHealth: 100, purchasePrice: 158_000, price: 175_000 });
  });

  it("refuse une reprise déjà en vente, une reprise inconnue et une fiche incohérente", async () => {
    const agent = await makeExchange();
    const [pending] = (await agent.get("/admin/trade-ins")).body.data;
    expect((await agent.patch("/admin/trade-ins/99999").send(sheetOf())).status).toBe(404);
    // Une pièce changée dont l'origine n'est pas dite : même règle qu'à l'échange.
    expect((await agent.patch(`/admin/trade-ins/${pending.id}`).send(sheetOf({ replacedParts: ["Batterie"], compatibleParts: ["Écran"] }))).status).toBe(400);
    expect((await agent.patch(`/admin/trade-ins/${pending.id}`).send(sheetOf({ repairCost: -5 }))).status).toBe(400);
    await agent.post(`/admin/trade-ins/${pending.id}/publish`).send({ price: 175_000 }).expect(201);
    expect((await agent.patch(`/admin/trade-ins/${pending.id}`).send(sheetOf())).status).toBe(409);
  });
});
