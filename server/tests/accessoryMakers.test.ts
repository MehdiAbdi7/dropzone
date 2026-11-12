import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];
let chargers: { id: number };
let cases: { id: number };

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
  // Deux types d'accessoires (lignes de `brands` de la catégorie Accessoires) ; « Anker » du
  // catalogue de test sert ici de troisième type, vide.
  chargers = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Chargeurs", slug: "chargeurs", position: 1 } });
  cases = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Coques", slug: "coques", position: 2 } });
});

describe("Marques d'accessoires du back-office", () => {
  it("crée une marque dans un type, avec le logo de la bibliothèque, en fin de liste", async () => {
    const first = await admin.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Samsung" });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ name: "Samsung", slug: "samsung", logoUrl: "/brands/samsung.svg", position: 0, typeId: chargers.id });
    const second = await admin.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Anker Pro" });
    expect(second.body.data).toMatchObject({ slug: "anker-pro", logoUrl: null, position: 1 });
  });

  it("refuse une marque sous une marque d'appareils", async () => {
    const response = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/makers`).send({ name: "Apple" });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Les marques d'accessoires se rangent dans un type d'accessoires");
  });

  it("refuse un type inconnu", async () => {
    expect((await admin.post("/admin/brands/99999/makers").send({ name: "Apple" })).status).toBe(404);
  });

  it("refuse une marque déjà présente dans le type, l'accepte dans un autre", async () => {
    await admin.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Apple" }).expect(201);
    expect((await admin.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Apple" })).status).toBe(409);
    expect((await admin.post(`/admin/brands/${cases.id}/makers`).send({ name: "Apple" })).status).toBe(201);
  });

  it("liste toutes les marques avec leur type et leur nombre de produits", async () => {
    const apple = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Apple", slug: "apple" } });
    await prisma.accessoryMaker.create({ data: { typeId: cases.id, name: "iPhone", slug: "iphone", position: 0 } });
    await prisma.product.update({ where: { id: catalog.charger.id }, data: { makerId: apple.id, brandId: chargers.id } });
    const response = await admin.get("/admin/accessory-makers");
    expect(response.status).toBe(200);
    expect(
      response.body.data.map((m: { slug: string; typeId: number; productCount: number }) => [m.slug, m.typeId, m.productCount]),
    ).toEqual([
      ["apple", chargers.id, 1],
      ["iphone", cases.id, 0],
    ]);
  });

  it("renomme (le slug suit), repositionne, et n'accepte comme logo choisi qu'un fichier de la bibliothèque", async () => {
    const { body } = await admin.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Anker" });
    const url = `/admin/accessory-makers/${body.data.id}`;
    expect((await admin.patch(url).send({ logoUrl: "https://exemple.com/logo.svg" })).status).toBe(400);
    const response = await admin.patch(url).send({ name: "Anker Nano", position: 3, logoUrl: "/brands/sony.svg" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: "Anker Nano", slug: "anker-nano", position: 3, logoUrl: "/brands/sony.svg" });
  });

  it("refuse de supprimer une marque utilisée, accepte une marque vide", async () => {
    const used = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Apple", slug: "apple" } });
    await prisma.product.update({ where: { id: catalog.charger.id }, data: { makerId: used.id, brandId: chargers.id } });
    expect((await admin.delete(`/admin/accessory-makers/${used.id}`)).status).toBe(409);
    const empty = await admin.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Baseus" });
    expect((await admin.delete(`/admin/accessory-makers/${empty.body.data.id}`)).status).toBe(204);
  });

  it("emporte les marques d'un type vide quand on le supprime", async () => {
    await admin.post(`/admin/brands/${cases.id}/makers`).send({ name: "iPhone" }).expect(201);
    expect((await admin.delete(`/admin/brands/${cases.id}`)).status).toBe(204);
    expect(await prisma.accessoryMaker.count()).toBe(0);
  });

  it("refuse l'envoi d'un logo sans image", async () => {
    const { body } = await admin.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Anker" });
    expect((await admin.post(`/admin/accessory-makers/${body.data.id}/logo`)).status).toBe(400);
  });

  it("interdit les marques d'accessoires à un client", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/accessory-makers")).status).toBe(403);
    expect((await agent.post(`/admin/brands/${chargers.id}/makers`).send({ name: "Apple" })).status).toBe(403);
  });
});

describe("Marque d'un accessoire", () => {
  const body = (extra: Record<string, unknown>) => ({
    name: "Bloc chargeur Anker Nano",
    description: "Bloc compact",
    categoryId: catalog.accessories.id,
    brandId: chargers.id,
    status: "published",
    variants: [{ sku: "BLOC-ANKER-45W", price: 5500, stock: 10, options: { Puissance: "45 W" } }],
    ...extra,
  });

  it("range l'accessoire dans la marque de son type", async () => {
    const anker = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Anker", slug: "anker" } });
    const created = await admin.post("/admin/products").send(body({ makerId: anker.id }));
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.maker).toMatchObject({ id: anker.id, slug: "anker" });
  });

  it("refuse la marque d'un autre type", async () => {
    const other = await prisma.accessoryMaker.create({ data: { typeId: cases.id, name: "iPhone", slug: "iphone" } });
    const response = await admin.post("/admin/products").send(body({ makerId: other.id }));
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Cette marque n'appartient pas au type du produit");
  });

  it("refuse une marque sans type, et une marque inconnue", async () => {
    const anker = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Anker", slug: "anker" } });
    expect((await admin.post("/admin/products").send(body({ brandId: null, makerId: anker.id }))).status).toBe(400);
    expect((await admin.post("/admin/products").send(body({ makerId: 99999 }))).status).toBe(400);
  });

  it("refuse une marque d'accessoires sur un appareil", async () => {
    const anker = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Anker", slug: "anker" } });
    const response = await admin.post("/admin/products").send({
      name: "Samsung Galaxy S24 Ultra",
      description: "Titane",
      categoryId: catalog.phones.id,
      deviceModelId: catalog.galaxy.id,
      brandId: catalog.samsungBrand.id,
      makerId: anker.id,
      variants: [{ sku: "S24U", price: 215000, stock: 1, warrantyMonths: 12 }],
    });
    expect(response.status).toBe(400);
  });

  it("change de type : la marque du type d'avant est refusée à la modification", async () => {
    const anker = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Anker", slug: "anker" } });
    const created = await admin.post("/admin/products").send(body({ makerId: anker.id }));
    const update = await admin.patch(`/admin/products/${created.body.data.id}`).send(body({ brandId: cases.id, makerId: anker.id }));
    expect(update.status).toBe(400);
    const cleared = await admin.patch(`/admin/products/${created.body.data.id}`).send(body({ brandId: cases.id, makerId: null }));
    expect(cleared.status).toBe(200);
  });
});

describe("Boutique : marques d'accessoires", () => {
  async function setup() {
    const anker = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Anker", slug: "anker", position: 1 } });
    const apple = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Apple", slug: "apple", position: 0 } });
    await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Vide", slug: "vide", position: 2 } });
    const make = (name: string, makerId: number | null, status: "published" | "draft", variants: { sku: string; price: number; stock: number; options?: object }[]) =>
      prisma.product.create({
        data: {
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: `${name} : description`,
          specs: { Port: "USB-C" },
          categoryId: catalog.accessories.id,
          brandId: chargers.id,
          makerId,
          status,
          minPrice: Math.min(...variants.map((v) => v.price)),
          newPrice: Math.min(...variants.map((v) => v.price)),
          images: { create: [{ url: "/products/charger.svg" }] },
          variants: { create: variants },
        },
      });
    await make("Bloc Anker", anker.id, "published", [
      { sku: "A-65", price: 6000, stock: 0, options: { Puissance: "65 W" } },
      { sku: "A-20", price: 3500, stock: 10, options: { Puissance: "20 W" } },
    ]);
    await make("Bloc Apple", apple.id, "published", [{ sku: "AP-20", price: 6500, stock: 4, options: { Puissance: "20 W" } }]);
    await make("Brouillon Anker", anker.id, "draft", [{ sku: "A-DRAFT", price: 100, stock: 1 }]);
    await make("Chargeur sans marque", null, "published", [{ sku: "NOBRAND", price: 1000, stock: 2 }]);
    return { anker, apple };
  }

  it("liste dans /categories les marques de chaque type, celles qui ont des produits publiés, dans l'ordre", async () => {
    await setup();
    const response = await request(app).get("/categories");
    const accessories = response.body.data.find((c: { slug: string }) => c.slug === "accessoires");
    const type = accessories.brands.find((b: { slug: string }) => b.slug === "chargeurs");
    expect(type.makers.map((m: { slug: string; productCount: number }) => [m.slug, m.productCount])).toEqual([
      ["apple", 1],
      ["anker", 1],
    ]);
    // Les produits publiés du type qui n'ont pas de marque : la carte « Autres ».
    expect(type.withoutMaker).toBe(1);
    // Une marque d'appareils n'a pas de marques d'accessoires.
    const phones = response.body.data.find((c: { slug: string }) => c.slug === "smartphones");
    expect(phones.brands[0].makers).toEqual([]);
  });

  it("donne la marque dans la fiche publique du produit", async () => {
    const { anker } = await setup();
    const response = await request(app).get("/products/bloc-anker");
    expect(response.body.data.maker).toMatchObject({ name: "Anker", slug: anker.slug });
    expect(response.body.data.brand).toMatchObject({ slug: "chargeurs" });
  });
});
