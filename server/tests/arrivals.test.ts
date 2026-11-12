import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Les derniers arrivages de l'accueil (12/11, demande de Mehdi) : un appareil remonte quand le
// magasin ajoute du stock (un nouvel exemplaire, une nouvelle variante, un stock qui augmente),
// pas seulement quand sa fiche est créée.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];
let galaxy: { id: number; variants: { id: number }[] };

const longAgo = new Date("2026-01-01T00:00:00Z");
const arrivals = async () =>
  (await request(app).get("/products?sort=arrivages&appareils=1&enstock=1")).body.data.map((p: { name: string }) => p.name);

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
  galaxy = await prisma.product.create({
    data: {
      name: "Galaxy S24 Ultra",
      slug: "galaxy-s24-ultra",
      description: "Grand écran",
      categoryId: catalog.phones.id,
      deviceModelId: catalog.galaxy.id,
      brandId: catalog.samsungBrand.id,
      status: "published",
      variants: { create: [{ sku: "S24U-NEW", price: 170000, stock: 2, warrantyMonths: 12 }] },
    },
    select: { id: true, variants: { select: { id: true } } },
  });
  // L'iPhone du catalogue est arrivé il y a longtemps, le Galaxy un peu après.
  await prisma.product.update({ where: { id: catalog.phone.id }, data: { stockedAt: longAgo } });
  await prisma.product.update({ where: { id: galaxy.id }, data: { stockedAt: new Date("2026-02-01T00:00:00Z") } });
});

const galaxyBody = (variant: { stock: number; price?: number }) => ({
  name: "Galaxy S24 Ultra",
  description: "Grand écran",
  categoryId: catalog.phones.id,
  deviceModelId: catalog.galaxy.id,
  brandId: catalog.samsungBrand.id,
  status: "published",
  variants: [{ id: galaxy.variants[0].id, sku: "S24U-NEW", price: variant.price ?? 170000, stock: variant.stock, condition: "new", warrantyMonths: 12 }],
});

describe("Derniers arrivages", () => {
  it("range les appareils du dernier arrivage au plus ancien", async () => {
    expect(await arrivals()).toEqual(["Galaxy S24 Ultra", "iPhone 15 Pro Max"]);
  });

  it("un nouvel exemplaire fait remonter le produit", async () => {
    const response = await admin.post(`/admin/models/${catalog.iphone.id}/variants`).send({
      sku: "IP-NEW-512",
      price: 260000,
      stock: 1,
      condition: "new",
      warrantyMonths: 12,
      options: { Stockage: "512 Go" },
      color: "Titane noir",
    });
    expect(response.status).toBe(201);
    expect(await arrivals()).toEqual(["iPhone 15 Pro Max", "Galaxy S24 Ultra"]);
  });

  it("un stock qui augmente fait remonter le produit", async () => {
    await prisma.product.update({ where: { id: catalog.phone.id }, data: { stockedAt: new Date("2026-03-01T00:00:00Z") } });
    await admin.patch(`/admin/products/${galaxy.id}`).send(galaxyBody({ stock: 5 })).expect(200);
    expect(await arrivals()).toEqual(["Galaxy S24 Ultra", "iPhone 15 Pro Max"]);
  });

  it("un stock qui baisse ou un prix changé ne le fait pas remonter", async () => {
    await prisma.product.update({ where: { id: catalog.phone.id }, data: { stockedAt: new Date("2026-03-01T00:00:00Z") } });
    await admin.patch(`/admin/products/${galaxy.id}`).send(galaxyBody({ stock: 1, price: 160000 })).expect(200);
    expect(await arrivals()).toEqual(["iPhone 15 Pro Max", "Galaxy S24 Ultra"]);
  });

  it("une nouvelle variante dans le formulaire fait remonter le produit", async () => {
    await prisma.product.update({ where: { id: catalog.phone.id }, data: { stockedAt: new Date("2026-03-01T00:00:00Z") } });
    const body = galaxyBody({ stock: 2 });
    body.variants.push({ sku: "S24U-NEW-1TO", price: 210000, stock: 1, condition: "new", warrantyMonths: 12 } as never);
    await admin.patch(`/admin/products/${galaxy.id}`).send(body).expect(200);
    expect((await arrivals())[0]).toBe("Galaxy S24 Ultra");
  });

  it("n'inclut ni les accessoires ni les appareils épuisés", async () => {
    await prisma.product.update({ where: { id: catalog.charger.id }, data: { stockedAt: new Date("2026-06-01T00:00:00Z") } });
    await prisma.productVariant.updateMany({ where: { productId: galaxy.id }, data: { stock: 0 } });
    expect(await arrivals()).toEqual(["iPhone 15 Pro Max"]);
  });

  it("un produit créé est un arrivage", async () => {
    const before = await prisma.product.findUniqueOrThrow({ where: { id: galaxy.id }, select: { stockedAt: true } });
    const created = await prisma.product.create({
      data: { name: "Neuf", slug: "neuf", description: "x", categoryId: catalog.phones.id, status: "published" },
      select: { stockedAt: true },
    });
    expect(created.stockedAt.getTime()).toBeGreaterThan(before.stockedAt.getTime());
  });
});
