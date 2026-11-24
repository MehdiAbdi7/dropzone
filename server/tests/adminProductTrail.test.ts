import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Le chemin d'un produit dans l'en-tête de sa fiche (24/11) : Catalogue › catégorie › marque › série. La fiche admin
// donne donc la série du modèle et la marque du produit, pour que chaque morceau soit un lien.
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
});

describe("GET /admin/products/:id, de quoi tracer le chemin", () => {
  it("donne la série du modèle et la marque d'un appareil", async () => {
    const series = await prisma.series.create({ data: { brandId: catalog.iphoneBrand.id, name: "iPhone 15", slug: "iphone-15" } });
    await prisma.deviceModel.update({ where: { id: catalog.iphone.id }, data: { seriesId: series.id } });
    const product = await prisma.product.findFirstOrThrow({ where: { slug: "iphone-15-pro-max" } });
    await prisma.product.update({ where: { id: product.id }, data: { brandId: catalog.iphoneBrand.id } });
    const { agent } = await loginAs("admin");

    const response = await agent.get(`/admin/products/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.brand).toMatchObject({ id: catalog.iphoneBrand.id, name: "iPhone" });
    expect(response.body.data.deviceModel).toMatchObject({ id: catalog.iphone.id, series: { id: series.id, name: "iPhone 15" } });
  });

  it("un modèle sans série, ou un accessoire sans modèle, n'a pas de série", async () => {
    const device = await prisma.product.findFirstOrThrow({ where: { slug: "iphone-15-pro-max" } });
    const accessory = await prisma.product.findFirstOrThrow({ where: { slug: "chargeur-usb-c-20-w" } });
    const { agent } = await loginAs("admin");

    const withoutSeries = await agent.get(`/admin/products/${device.id}`);
    expect(withoutSeries.body.data.deviceModel.series).toBeNull();
    const accessoryPage = await agent.get(`/admin/products/${accessory.id}`);
    expect(accessoryPage.body.data.deviceModel).toBeNull();
  });
});
