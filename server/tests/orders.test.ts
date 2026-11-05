import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, customer, loginAs, previewThenOrder, resetDb } from "./helpers.js";

const stockOf = async (sku: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

beforeEach(async () => {
  await resetDb();
  await createCatalog();
});

describe("POST /orders/preview", () => {
  it("ajoute l'article offert de l'affaire, à 0 DA, et calcule les totaux", async () => {
    const response = await request(app)
      .post("/orders/preview")
      .send({ items: [{ sku: "IP-R-DEAL", quantity: 1 }] });
    expect(response.status).toBe(200);
    const { lines, subtotal, shippingFee, total, canOrder } = response.body.data;
    expect(lines).toEqual([
      expect.objectContaining({ sku: "IP-R-DEAL", unitPrice: 185000, isGift: false }),
      expect.objectContaining({ sku: "CHG-20W", unitPrice: 0, normalPrice: 2500, isGift: true, giftFor: "IP-R-DEAL" }),
    ]);
    expect(lines[0].conditionReport).toContain("Défauts : Cache arrière fissuré");
    expect({ subtotal, shippingFee, total, canOrder }).toEqual({
      subtotal: 185000,
      shippingFee: 0,
      total: 185000,
      canOrder: true,
    });
  });

  it("liste les limitations à accepter", async () => {
    const response = await request(app)
      .post("/orders/preview")
      .send({ items: [{ sku: "IP-R-WIFI", quantity: 1 }] });
    expect(response.body.data.limitations).toEqual([
      { sku: "IP-R-WIFI", name: "iPhone 15 Pro Max", limitations: ["Wi-Fi seulement (ne lit pas les cartes SIM)"] },
    ]);
  });

  it("signale un reconditionné demandé deux fois et un article inconnu", async () => {
    const response = await request(app)
      .post("/orders/preview")
      .send({ items: [{ sku: "IP-R-DEAL", quantity: 2 }, { sku: "N-EXISTE-PAS", quantity: 1 }] });
    expect(response.body.data.canOrder).toBe(false);
    expect(response.body.data.unavailable).toEqual(["N-EXISTE-PAS"]);
    expect(response.body.data.lines[0].problem).toBe("Il n'en reste que 1");
  });

  it("garde la boîte, l'origine des pièces et les détails d'une affaire jusqu'à la commande", async () => {
    const phone = await prisma.product.findUniqueOrThrow({ where: { slug: "iphone-15-pro-max" } });
    await prisma.productVariant.create({
      data: {
        productId: phone.id,
        sku: "IP-R-SB",
        price: 230000,
        stock: 1,
        condition: "refurbished",
        grade: 10,
        batteryHealth: 100,
        replacedParts: ["Écran"],
        compatibleParts: ["Écran"],
        withBox: false,
        details: "Neuf, juste sans boîte",
      },
    });
    const report =
      "Note 10/10 · Batterie 100 % · Remplacé : Écran (compatible) · Défauts : aucun · Limitations : aucune · Sans boîte · Détails : Neuf, juste sans boîte";
    const items = [{ sku: "IP-R-SB", quantity: 1 }];
    const preview = await request(app).post("/orders/preview").send({ items });
    expect(preview.body.data.lines[0].conditionReport).toBe(report);

    await previewThenOrder(items);
    const order = await prisma.order.findUniqueOrThrow({ where: { number: 1001 }, include: { items: true } });
    expect(order.items[0].conditionReport).toBe(report);
  });

  it("ajoute les frais de livraison sous 10 000 DA", async () => {
    const response = await request(app)
      .post("/orders/preview")
      .send({ items: [{ sku: "COQ-IP15PM", quantity: 2 }] });
    expect(response.body.data).toMatchObject({ subtotal: 3600, shippingFee: 600, total: 4200 });
  });
});

describe("POST /orders", () => {
  it("crée la commande 1001, baisse le stock du téléphone et du cadeau, recalcule minPrice", async () => {
    const response = await previewThenOrder(
      [{ sku: "IP-R-WIFI", quantity: 1 }, { sku: "IP-R-DEAL", quantity: 1 }],
      { acceptLimitations: true },
    );
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ number: 1001, total: 335000 });
    expect(await stockOf("IP-R-DEAL")).toBe(0);
    expect(await stockOf("CHG-20W")).toBe(4);

    const order = await prisma.order.findUniqueOrThrow({ where: { number: 1001 }, include: { items: true } });
    expect(order.limitationsAccepted).toBe(true);
    expect(order.phone).toBe("0555123456");
    expect(order.items.find((item) => item.isGift)).toMatchObject({ sku: "CHG-20W", unitPrice: 0 });

    // Les deux reconditionnés sont vendus : le « à partir de » passe au neuf.
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: "iphone-15-pro-max" } });
    expect(product.minPrice).toBe(245000);
  });

  it("refuse une commande sans accepter les limitations", async () => {
    const response = await previewThenOrder([{ sku: "IP-R-WIFI", quantity: 1 }]);
    expect(response.status).toBe(400);
    expect(await stockOf("IP-R-WIFI")).toBe(1);
  });

  it("refuse une commande sans les conditions générales de vente", async () => {
    const response = await previewThenOrder([{ sku: "COQ-IP15PM", quantity: 1 }], { acceptTerms: false });
    expect(response.status).toBe(400);
  });

  it("refuse si le cadeau s'est épuisé depuis le récapitulatif, puis passe sans lui", async () => {
    const items = [{ sku: "IP-R-DEAL", quantity: 1 }];
    const preview = await request(app).post("/orders/preview").send({ items });
    await prisma.productVariant.update({ where: { sku: "CHG-20W" }, data: { stock: 0 } });

    const refused = await request(app)
      .post("/orders")
      .send({ items, ...customer, cartHash: preview.body.data.cartHash });
    expect(refused.status).toBe(409);
    expect(await stockOf("IP-R-DEAL")).toBe(1);

    const again = await request(app).post("/orders/preview").send({ items });
    expect(again.body.data.notices).toHaveLength(1);
    expect(again.body.data.lines).toHaveLength(1);
    const accepted = await request(app)
      .post("/orders")
      .send({ items, ...customer, cartHash: again.body.data.cartHash });
    expect(accepted.status).toBe(201);
  });

  it("refuse si un prix a changé depuis le récapitulatif", async () => {
    const items = [{ sku: "COQ-IP15PM", quantity: 1 }];
    const preview = await request(app).post("/orders/preview").send({ items });
    await prisma.productVariant.update({ where: { sku: "COQ-IP15PM" }, data: { price: 2000 } });
    const response = await request(app)
      .post("/orders")
      .send({ items, ...customer, cartHash: preview.body.data.cartHash });
    expect(response.status).toBe(409);
  });

  it("refuse si la fiche d'état a changé depuis le récapitulatif", async () => {
    const items = [{ sku: "IP-R-DEAL", quantity: 1 }];
    const preview = await request(app).post("/orders/preview").send({ items });
    await prisma.productVariant.update({ where: { sku: "IP-R-DEAL" }, data: { details: "Écran remplacé" } });
    const response = await request(app)
      .post("/orders")
      .send({ items, ...customer, cartHash: preview.body.data.cartHash });
    expect(response.status).toBe(409);
  });

  it("deux clients et un seul reconditionné : une commande passe, l'autre reçoit 409", async () => {
    const items = [{ sku: "IP-R-DEAL", quantity: 1 }];
    const preview = await request(app).post("/orders/preview").send({ items });
    const body = { items, ...customer, cartHash: preview.body.data.cartHash };
    const [first, second] = await Promise.all([
      request(app).post("/orders").send(body),
      request(app).post("/orders").send(body),
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await stockOf("IP-R-DEAL")).toBe(0);
    expect(await stockOf("CHG-20W")).toBe(4);
  });

  it("donne 5 numéros différents à 5 commandes simultanées", async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => previewThenOrder([{ sku: "COQ-IP15PM", quantity: 1 }])),
    );
    const numbers = responses.map((response) => response.body.data.number);
    expect(new Set(numbers).size).toBe(5);
    expect(await stockOf("COQ-IP15PM")).toBe(5);
  });
});

describe("La garantie de chaque appareil", () => {
  beforeEach(async () => {
    await prisma.productVariant.update({ where: { sku: "IP-R-DEAL" }, data: { warrantyMonths: 6 } });
  });

  it("est sur la ligne du panier, et rien sur l'article offert sans garantie", async () => {
    const preview = await request(app)
      .post("/orders/preview")
      .send({ items: [{ sku: "IP-R-DEAL", quantity: 1 }] });
    const bySku = (sku: string) => preview.body.data.lines.find((line: { sku: string }) => line.sku === sku);
    expect(bySku("IP-R-DEAL").warrantyMonths).toBe(6);
    expect(bySku("CHG-20W").warrantyMonths).toBeNull();
  });

  it("refuse la commande si la garantie a changé depuis le récapitulatif", async () => {
    const items = [{ sku: "IP-R-DEAL", quantity: 1 }];
    const preview = await request(app).post("/orders/preview").send({ items });
    await prisma.productVariant.update({ where: { sku: "IP-R-DEAL" }, data: { warrantyMonths: 3 } });
    const response = await request(app)
      .post("/orders")
      .send({ items, ...customer, cartHash: preview.body.data.cartHash });
    expect(response.status).toBe(409);
  });

  it("est recopiée dans la commande, qui ne change plus si la fiche change", async () => {
    const response = await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);
    expect(response.status).toBe(201);
    await prisma.productVariant.update({ where: { sku: "IP-R-DEAL" }, data: { warrantyMonths: 12 } });
    const order = await prisma.order.findUniqueOrThrow({ where: { number: 1001 }, include: { items: true } });
    const line = order.items.find((item) => item.sku === "IP-R-DEAL");
    expect(line?.warrantyMonths).toBe(6);
  });

  it("est donnée par le suivi de commande", async () => {
    await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);
    const found = await request(app).post("/orders/track").send({ number: 1001, phone: "0555123456" });
    const line = found.body.data.items.find((item: { sku: string }) => item.sku === "IP-R-DEAL");
    expect(line.warrantyMonths).toBe(6);
  });
});

describe("Suivi et historique", () => {
  it("retrouve une commande avec le numéro et le téléphone, sans l'adresse", async () => {
    await previewThenOrder([{ sku: "COQ-IP15PM", quantity: 1 }]);
    const found = await request(app).post("/orders/track").send({ number: 1001, phone: "0555123456" });
    expect(found.status).toBe(200);
    expect(found.body.data).toMatchObject({ number: 1001, status: "pending", wilaya: "Alger" });
    expect(found.body.data.address).toBeUndefined();

    const wrongPhone = await request(app).post("/orders/track").send({ number: 1001, phone: "0666000000" });
    expect(wrongPhone.status).toBe(404);
  });

  it("rattache la commande au client connecté, et cache celle d'un autre", async () => {
    const { agent } = await loginAs("customer", "amine@test.dz");
    await previewThenOrder([{ sku: "COQ-IP15PM", quantity: 1 }], {}, agent);
    await previewThenOrder([{ sku: "COQ-IP15PM", quantity: 1 }]);

    const mine = await agent.get("/orders/mine");
    expect(mine.body.data.map((o: { number: number }) => o.number)).toEqual([1001]);
    expect((await agent.get("/orders/mine/1001")).status).toBe(200);
    expect((await agent.get("/orders/mine/1002")).status).toBe(404);
  });
});

// La barre du panier (05/11) : chaque ligne montre la photo de sa couleur quand elle existe.
describe("POST /orders/preview, la photo de la couleur", () => {
  it("prend la photo de la couleur de la ligne", async () => {
    await prisma.productVariant.update({
      where: { sku: "IP-NEW-256" },
      data: { options: { Stockage: "256 Go", Couleur: "Titane bleu" } },
    });
    const model = await prisma.deviceModel.findUniqueOrThrow({ where: { slug: "apple-iphone-15-pro-max" } });
    await prisma.modelColorPhoto.create({ data: { deviceModelId: model.id, color: "Titane bleu", url: "https://x/bleu.webp" } });
    const response = await request(app).post("/orders/preview").send({ items: [{ sku: "IP-NEW-256", quantity: 1 }] });
    expect(response.body.data.lines[0].image).toBe("https://x/bleu.webp");
  });

  it("garde la photo du produit sans photo de couleur", async () => {
    const response = await request(app).post("/orders/preview").send({ items: [{ sku: "IP-NEW-256", quantity: 1 }] });
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: "iphone-15-pro-max" }, include: { images: true } });
    expect(response.body.data.lines[0].image).toBe(product.images[0]?.url ?? null);
  });
});
