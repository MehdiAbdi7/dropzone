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
    withBox: false,
    warrantyMonths: 6,
  };

  const body = () => ({
    name: "Samsung Galaxy S24 Ultra",
    description: "Titane et S Pen",
    categoryId: catalog.phones.id,
    deviceModelId: catalog.galaxy.id,
    specs: { Écran: "6,8 pouces" },
    status: "published",
    variants: [
      { sku: "S24U-256", options: { Stockage: "256 Go" }, price: 215000, stock: 3, warrantyMonths: 12 },
      { ...refurbished, gifts: [{ giftVariantId: catalog.chargerVariant.id }] },
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
      variants: [{ ...refurbished, gifts: [{ giftVariantId: phoneVariant.id }] }],
    });
    expect(response.status).toBe(400);
  });

  const sealed = { sku: "S24U-256", options: { Stockage: "256 Go" }, price: 215000, stock: 3, warrantyMonths: 12 };

  it("accepte un article offert sur un neuf scellé", async () => {
    const response = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...sealed, gifts: [{ giftVariantId: catalog.chargerVariant.id }] }],
    });
    expect(response.status).toBe(201);
  });

  it("refuse des détails sur un neuf scellé", async () => {
    const response = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...sealed, details: "Sans boîte" }],
    });
    expect(response.status).toBe(400);
  });

  it("refuse une affaire sans dire si elle a sa boîte", async () => {
    const response = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...refurbished, withBox: null }],
    });
    expect(response.status).toBe(400);
  });

  it("refuse une pièce compatible qui n'a pas été changée", async () => {
    const response = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...refurbished, replacedParts: ["Batterie"], compatibleParts: ["Caméra"] }],
    });
    expect(response.status).toBe(400);
  });

  it("range la boîte, les pièces compatibles et les détails d'une affaire (détails vides = aucun)", async () => {
    const created = await admin.post("/admin/products").send({
      ...body(),
      variants: [
        sealed,
        { ...refurbished, withBox: true, replacedParts: ["Écran", "Batterie"], compatibleParts: ["Écran"], details: "   " },
      ],
    });
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    const bySku = (sku: string) => detail.body.data.variants.find((v: { sku: string }) => v.sku === sku);
    expect(bySku("S24U-R-001")).toMatchObject({ withBox: true, compatibleParts: ["Écran"], details: null });
    expect(bySku("S24U-256")).toMatchObject({ withBox: null, compatibleParts: [], details: null });
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
        { id: kept.id, sku: "S24U-256", options: { Stockage: "256 Go" }, price: 209000, stock: 2, warrantyMonths: 12 },
        { sku: "S24U-512", options: { Stockage: "512 Go" }, price: 245000, stock: 1, warrantyMonths: 12 },
      ],
    });
    expect(response.status).toBe(200);
    const after = await admin.get(`/admin/products/${id}`);
    expect(after.body.data.variants.map((v: { sku: string }) => v.sku)).toEqual(["S24U-256", "S24U-512"]);
    expect(after.body.data.minPrice).toBe(209000);
    expect(after.body.data.slug).toBe(created.body.data.slug);
  });

  // ---------- Le vrai catalogue : garantie, origine, référence ----------

  it("crée une affaire sans note ni batterie, avec sa garantie, son origine et sa référence", async () => {
    const created = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...refurbished, grade: null, batteryHealth: null, origin: "Europe", reference: "51057" }],
    });
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.variants[0]).toMatchObject({
      grade: null,
      batteryHealth: null,
      warrantyMonths: 6,
      origin: "Europe",
      reference: "51057",
    });
  });

  it("range une origine et une référence vides comme absentes", async () => {
    const created = await admin.post("/admin/products").send({
      ...body(),
      variants: [{ ...refurbished, origin: "", reference: "" }],
    });
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.variants[0]).toMatchObject({ origin: null, reference: null });
  });

  it("refuse un appareil sans garantie", async () => {
    const response = await admin
      .post("/admin/products")
      .send({ ...body(), variants: [{ ...refurbished, warrantyMonths: null }] });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Indiquez la garantie de chaque appareil, en mois");
  });

  it("accepte un accessoire sans garantie", async () => {
    const response = await admin.post("/admin/products").send({
      ...body(),
      name: "Câble USB-C 1 m",
      categoryId: catalog.accessories.id,
      deviceModelId: null,
      variants: [{ sku: "CBL-1M", price: 900, stock: 4 }],
    });
    expect(response.status).toBe(201);
  });

  it("refuse deux variantes du même envoi avec la même référence", async () => {
    const response = await admin.post("/admin/products").send({
      ...body(),
      variants: [
        { ...refurbished, reference: "51057" },
        { ...refurbished, sku: "S24U-R-002", reference: "51057" },
      ],
    });
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.error)).toContain("Deux variantes ont la même référence");
  });

  it("refuse une référence déjà prise par un autre produit, avec un message clair", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-R-WIFI" }, data: { reference: "51057" } });
    const response = await admin
      .post("/admin/products")
      .send({ ...body(), variants: [{ ...refurbished, reference: "51057" }] });
    expect(response.status).toBe(409);
    // Le message dit laquelle : un envoi peut porter plusieurs références.
    expect(response.body.error.message).toBe("La référence 51057 est déjà utilisée");
  });

  it("garde sa propre référence quand on modifie le produit", async () => {
    const created = await admin
      .post("/admin/products")
      .send({ ...body(), variants: [{ ...refurbished, reference: "51057" }] });
    const id = created.body.data.id;
    const detail = await admin.get(`/admin/products/${id}`);
    const variant = detail.body.data.variants[0];
    const response = await admin
      .patch(`/admin/products/${id}`)
      .send({ ...body(), variants: [{ ...refurbished, id: variant.id, reference: "51057", price: 160000 }] });
    expect(response.status).toBe(200);
  });

  it("cherche un produit par la référence ou le SKU d'une variante", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-R-WIFI" }, data: { reference: "51057" } });
    const byReference = await admin.get("/admin/products?q=51057");
    expect(byReference.body.data.map((p: { name: string }) => p.name)).toEqual(["iPhone 15 Pro Max"]);
    const bySku = await admin.get("/admin/products?q=ip-r-deal");
    expect(bySku.body.data.map((p: { name: string }) => p.name)).toEqual(["iPhone 15 Pro Max"]);
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

// L'étape Couleur (05/11) : une couleur enregistrée sur un appareil devient une couleur de
// son modèle, et un modèle n'a qu'une fiche.
describe("Les couleurs du modèle suivent les exemplaires", () => {
  const product = (colors: string[]) => ({
    name: "Samsung Galaxy S24 Ultra",
    description: "Titane et S Pen",
    categoryId: catalog.phones.id,
    deviceModelId: catalog.galaxy.id,
    status: "published",
    variants: colors.map((color, index) => ({
      sku: `S24U-C${index}`,
      options: { Stockage: "256 Go", Couleur: color },
      price: 215000,
      stock: 1,
      warrantyMonths: 12,
    })),
  });
  const colorsOfGalaxy = async () =>
    (await prisma.deviceModel.findUniqueOrThrow({ where: { id: catalog.galaxy.id } })).colors;

  it("ajoute à la fin une couleur que le modèle n'a pas", async () => {
    await prisma.deviceModel.update({ where: { id: catalog.galaxy.id }, data: { colors: ["Noir", "Argent"] } });
    expect((await admin.post("/admin/products").send(product(["Bleu glacier"]))).status).toBe(201);
    expect(await colorsOfGalaxy()).toEqual(["Noir", "Argent", "Bleu glacier"]);
    // La couleur entre aussi dans la liste « Couleurs » du back-office.
    expect(await prisma.choice.count({ where: { group: "color", label: "Bleu glacier" } })).toBe(1);
  });

  it("ne double pas une couleur écrite autrement (casse, espace)", async () => {
    await prisma.deviceModel.update({ where: { id: catalog.galaxy.id }, data: { colors: ["Noir"] } });
    expect((await admin.post("/admin/products").send(product(["noir "]))).status).toBe(201);
    expect(await colorsOfGalaxy()).toEqual(["Noir"]);
  });

  it("donne sa première couleur à un modèle qui n'en avait pas", async () => {
    expect(await colorsOfGalaxy()).toEqual([]);
    expect((await admin.post("/admin/products").send(product(["Argent", "Argent"]))).status).toBe(201);
    expect(await colorsOfGalaxy()).toEqual(["Argent"]);
  });

  it("refuse une deuxième fiche pour le même modèle", async () => {
    expect((await admin.post("/admin/products").send(product(["Noir"]))).status).toBe(201);
    const again = product(["Noir"]);
    const second = await admin.post("/admin/products").send({ ...again, variants: [{ ...again.variants[0], sku: "S24U-BIS" }] });
    expect(second.status).toBe(409);
    expect(second.body.error.message).toBe("Ce modèle a déjà sa fiche produit");
  });

  it("ajoute aussi la couleur à la modification d'une fiche", async () => {
    const created = await admin.post("/admin/products").send(product(["Noir"]));
    const body = product(["Noir", "Violet titane"]);
    expect((await admin.patch(`/admin/products/${created.body.data.id}`).send(body)).status).toBe(200);
    expect(await colorsOfGalaxy()).toEqual(["Noir", "Violet titane"]);
  });
});
