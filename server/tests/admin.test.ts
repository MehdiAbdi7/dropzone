import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

const stockOf = async (sku: string) =>
  (await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).stock;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
});

describe("Protection de /admin", () => {
  it("répond 401 sans connexion et 403 pour un client", async () => {
    expect((await request(app).get("/admin/stats")).status).toBe(401);
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/stats")).status).toBe(403);
  });
});

describe("Produits", () => {
  const refurbished = {
    sku: "S24U-R-001",
    options: { Stockage: "256 Go", Couleur: "Noir" },
    price: 169000,
    stock: 1,
    condition: "refurbished",
    grade: 9,
    batteryHealth: 94,
    defects: ["Rayures légères sur l'écran"],
  };

  const body = () => ({
    name: "Samsung Galaxy S24 Ultra",
    description: "Titane et S Pen",
    categoryId: catalog.phones.id,
    deviceModelId: catalog.galaxy.id,
    specs: { Écran: "6,8 pouces" },
    status: "published",
    variants: [
      { sku: "S24U-256", options: { Stockage: "256 Go" }, price: 215000, stock: 3 },
      { ...refurbished, isDeal: true, gifts: [{ giftVariantId: catalog.chargerVariant.id }] },
    ],
  });

  it("crée un produit avec un neuf, un reconditionné et un article offert", async () => {
    const response = await admin.post("/admin/products").send(body());
    expect(response.status).toBe(201);
    const product = await request(app).get(`/products/${response.body.data.slug}`);
    expect(product.body.data.minPrice).toBe(169000);
    const variant = product.body.data.variants.find((v: { sku: string }) => v.sku === "S24U-R-001");
    expect(variant).toMatchObject({ grade: 9, batteryHealth: 94, defects: ["Rayures légères sur l'écran"] });
    expect(variant.gifts[0].sku).toBe("CHG-20W");
  });

  it("refuse un reconditionné dans les accessoires", async () => {
    const response = await admin.post("/admin/products").send({
      ...body(),
      categoryId: catalog.accessories.id,
      deviceModelId: null,
      variants: [refurbished],
    });
    expect(response.status).toBe(400);
  });

  it("refuse un reconditionné avec un stock de 2", async () => {
    const response = await admin
      .post("/admin/products")
      .send({ ...body(), variants: [{ ...refurbished, stock: 2 }] });
    expect(response.status).toBe(400);
    expect(response.body.error.details).toBeDefined();
  });

  it("refuse un téléphone comme article offert", async () => {
    const phoneVariant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-NEW-256" } });
    const response = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...refurbished, isDeal: true, gifts: [{ giftVariantId: phoneVariant.id }] }],
    });
    expect(response.status).toBe(400);
  });

  it("refuse des articles offerts ou des détails sur un appareil qui n'est pas une affaire", async () => {
    const withGifts = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...refurbished, gifts: [{ giftVariantId: catalog.chargerVariant.id }] }],
    });
    expect(withGifts.status).toBe(400);
    const withNote = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...refurbished, dealNote: "Comme neuf" }],
    });
    expect(withNote.status).toBe(400);
  });

  it("met un appareil en affaire avec ses détails (détails vides = aucun)", async () => {
    const created = await admin.post("/admin/products").send({
      ...body(),
      variants: [
        { sku: "S24U-256-SB", options: { Stockage: "256 Go" }, price: 189000, stock: 1, isDeal: true, dealNote: " Neuf, juste sans boîte " },
        { ...refurbished, isDeal: true, dealNote: "   " },
      ],
    });
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    const bySku = (sku: string) => detail.body.data.variants.find((v: { sku: string }) => v.sku === sku);
    expect(bySku("S24U-256-SB")).toMatchObject({ isDeal: true, dealNote: "Neuf, juste sans boîte" });
    expect(bySku("S24U-R-001")).toMatchObject({ isDeal: true, dealNote: null });
  });

  it("refuse un modèle qui n'est pas de la bonne sorte", async () => {
    const watch = await prisma.deviceModel.create({
      data: { brand: "Apple", name: "Apple Watch Series 9", slug: "apple-watch-series-9", kind: "watch" },
    });
    const response = await admin.post("/admin/products").send({ ...body(), deviceModelId: watch.id });
    expect(response.status).toBe(400);
  });

  it("modifie les variantes : retire, ajoute, remplace les cadeaux, recalcule minPrice", async () => {
    const created = await admin.post("/admin/products").send(body());
    const id = created.body.data.id;
    const detail = await admin.get(`/admin/products/${id}`);
    const kept = detail.body.data.variants.find((v: { sku: string }) => v.sku === "S24U-256");

    const response = await admin.patch(`/admin/products/${id}`).send({
      ...body(),
      variants: [
        { id: kept.id, sku: "S24U-256", options: { Stockage: "256 Go" }, price: 209000, stock: 2 },
        { sku: "S24U-512", options: { Stockage: "512 Go" }, price: 245000, stock: 1 },
      ],
    });
    expect(response.status).toBe(200);
    const after = await admin.get(`/admin/products/${id}`);
    expect(after.body.data.variants.map((v: { sku: string }) => v.sku)).toEqual(["S24U-256", "S24U-512"]);
    expect(after.body.data.minPrice).toBe(209000);
    expect(after.body.data.slug).toBe(created.body.data.slug);
  });

  it("liste les accessoires qu'on peut offrir", async () => {
    const response = await admin.get("/admin/gift-options");
    expect(response.body.data.map((v: { sku: string }) => v.sku).sort()).toEqual(["CHG-20W", "COQ-IP15PM"]);
  });
});

describe("Modèles, listes et catégories", () => {
  it("ajoute un modèle, refuse le doublon, refuse la suppression d'un modèle utilisé", async () => {
    const s20 = { brand: "Samsung", name: "Galaxy S20+", kind: "phone", releaseYear: 2020 };
    const created = await admin.post("/admin/models").send(s20);
    expect(created.status).toBe(201);
    expect(created.body.data.slug).toBe("samsung-galaxy-s20-plus");
    const duplicate = await admin.post("/admin/models").send(s20);
    expect(duplicate.status).toBe(409);
    expect((await admin.delete(`/admin/models/${catalog.iphone.id}`)).status).toBe(409);
  });

  it("demande l'année de sortie d'un nouveau modèle", async () => {
    const model = { brand: "Apple", name: "iPhone 18 Pro", kind: "phone" };
    expect((await admin.post("/admin/models").send(model)).status).toBe(400);
    expect((await admin.post("/admin/models").send({ ...model, releaseYear: 1999 })).status).toBe(400);
    const created = await admin.post("/admin/models").send({ ...model, releaseYear: 2026 });
    expect(created.status).toBe(201);
    expect(created.body.data.releaseYear).toBe(2026);
  });

  it("corrige l'année de sortie d'un modèle", async () => {
    const updated = await admin.patch(`/admin/models/${catalog.iphone.id}`).send({ releaseYear: 2025 });
    expect(updated.status).toBe(200);
    const list = await admin.get("/admin/models");
    expect(list.body.data.find((model: { id: number }) => model.id === catalog.iphone.id).releaseYear).toBe(2025);
    expect((await admin.patch("/admin/models/999999").send({ releaseYear: 2025 })).status).toBe(404);
    expect((await admin.patch(`/admin/models/${catalog.iphone.id}`).send({ releaseYear: 1999 })).status).toBe(400);
  });

  it("range les valeurs des listes par groupe", async () => {
    await admin.post("/admin/choices").send({ group: "limitation", label: "Bypass" }).expect(201);
    const response = await admin.get("/admin/choices");
    expect(response.body.data.limitation).toEqual([expect.objectContaining({ label: "Bypass" })]);
    expect(response.body.data.storage).toEqual([]);
  });

  it("refuse de supprimer une catégorie qui a des produits", async () => {
    const response = await admin.delete(`/admin/categories/${catalog.phones.id}`);
    expect(response.status).toBe(409);
  });
});

describe("Commandes", () => {
  async function placeDealOrder() {
    await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]).then((r) => expect(r.status).toBe(201));
    return prisma.order.findUniqueOrThrow({ where: { number: 1001 } });
  }

  it("annule une commande et rend le stock, cadeau compris, une seule fois", async () => {
    const order = await placeDealOrder();
    const [first, second] = await Promise.all([
      admin.patch(`/admin/orders/${order.id}/status`).send({ status: "cancelled" }),
      admin.patch(`/admin/orders/${order.id}/status`).send({ status: "cancelled" }),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(await stockOf("IP-R-DEAL")).toBe(1);
    expect(await stockOf("CHG-20W")).toBe(5);
  });

  it("refuse une transition interdite", async () => {
    const order = await placeDealOrder();
    const response = await admin.patch(`/admin/orders/${order.id}/status`).send({ status: "delivered" });
    expect(response.status).toBe(409);
  });

  it("suit le chemin normal jusqu'à la livraison", async () => {
    const order = await placeDealOrder();
    for (const status of ["confirmed", "shipped", "delivered"]) {
      const response = await admin.patch(`/admin/orders/${order.id}/status`).send({ status });
      expect(response.status).toBe(200);
    }
    expect((await admin.get(`/admin/orders/${order.id}`)).body.data.allowedTransitions).toEqual([]);
  });

  it("calcule le tableau de bord en SQL", async () => {
    await placeDealOrder();
    const response = await admin.get("/admin/stats");
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      revenueToday: 185000,
      revenueMonth: 185000,
      ordersToday: 1,
      ordersByStatus: { pending: 1 },
      refurbishedAvailable: 1,
      refurbishedSold: 2,
    });
  });
});
