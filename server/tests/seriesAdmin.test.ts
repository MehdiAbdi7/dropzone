import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { fillSeries } from "../src/scripts/series.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
});

const appleModel = (name: string, releaseYear = 2026) =>
  prisma.deviceModel.create({
    data: { brand: "Apple", name, slug: `apple-${name.toLowerCase().replace(/ /g, "-")}`, kind: "phone", releaseYear },
  });

describe("Créer, renommer et supprimer une série", () => {
  it("crée une série sous une marque", async () => {
    const response = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "iPhone 18" });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: "iPhone 18", slug: "iphone-18", brandId: catalog.iphoneBrand.id, coverUrl: null });
  });

  it("refuse un doublon dans la même marque", async () => {
    await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "iPhone 18" });
    const response = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "iPhone 18" });
    expect(response.status).toBe(409);
  });

  it("refuse un nom sans lettre latine (le slug serait vide)", async () => {
    const response = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "سلسلة" });
    expect(response.status).toBe(400);
  });

  it("renomme une série et recalcule son slug", async () => {
    const created = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "iPhone 18" });
    const response = await admin.patch(`/admin/series/${created.body.data.id}`).send({ name: "iPhone 18 (2026)" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: "iPhone 18 (2026)", slug: "iphone-18-2026" });
  });

  it("refuse l'envoi d'une couverture sans image", async () => {
    const created = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "iPhone 18" });
    const response = await admin.post(`/admin/series/${created.body.data.id}/cover`);
    expect(response.status).toBe(400);
  });

  it("supprime une série : ses modèles en vente reviennent dans l'alerte « sans série »", async () => {
    await fillSeries(prisma);
    const series = await prisma.series.findFirstOrThrow({ where: { slug: "iphone-15" } });

    expect((await admin.delete(`/admin/series/${series.id}`)).status).toBe(204);

    const response = await admin.get(`/admin/catalog/brands/${catalog.iphoneBrand.id}`);
    expect(response.body.data.unassigned).toEqual([
      { deviceModelId: catalog.iphone.id, name: "iPhone 15 Pro Max", productId: catalog.phone.id },
    ]);
  });
});

describe("Ranger les modèles d'une série", () => {
  it("refuse un modèle d'un autre fabricant", async () => {
    const created = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "iPhone 18" });
    const response = await admin
      .put(`/admin/series/${created.body.data.id}/models`)
      .send({ modelIds: [catalog.galaxy.id] });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Ce modèle n'est pas de cette marque");
    const galaxy = await prisma.deviceModel.findUniqueOrThrow({ where: { id: catalog.galaxy.id } });
    expect(galaxy.seriesId).toBeNull();
  });

  it("range les modèles dans l'ordre donné, et sort ceux qui n'y sont plus", async () => {
    const created = await admin.post(`/admin/brands/${catalog.iphoneBrand.id}/series`).send({ name: "iPhone 18" });
    const url = `/admin/series/${created.body.data.id}/models`;
    const pro = await appleModel("iPhone 18 Pro");
    const proMax = await appleModel("iPhone 18 Pro Max");

    expect((await admin.put(url).send({ modelIds: [pro.id, proMax.id] })).status).toBe(204);
    const ranged = await prisma.deviceModel.findMany({
      where: { id: { in: [pro.id, proMax.id] } },
      orderBy: { id: "asc" },
      select: { seriesId: true, seriesPosition: true },
    });
    expect(ranged).toEqual([
      { seriesId: created.body.data.id, seriesPosition: 0 },
      { seriesId: created.body.data.id, seriesPosition: 1 },
    ]);

    expect((await admin.put(url).send({ modelIds: [proMax.id] })).status).toBe(204);
    expect((await prisma.deviceModel.findUniqueOrThrow({ where: { id: pro.id } })).seriesId).toBeNull();
    expect((await prisma.deviceModel.findUniqueOrThrow({ where: { id: proMax.id } })).seriesPosition).toBe(0);
  });

  it("change la couleur d'affiche d'un modèle, seulement pour une couleur de la liste", async () => {
    await prisma.choice.create({ data: { group: "color", label: "Bordeaux" } });
    const url = `/admin/models/${catalog.iphone.id}`;

    const response = await admin.patch(url).send({ posterColor: "Bordeaux" });
    expect(response.status).toBe(200);
    expect(response.body.data.posterColor).toBe("Bordeaux");

    expect((await admin.patch(url).send({ posterColor: "Couleur inventée" })).status).toBe(400);
    expect((await admin.patch(url).send({})).status).toBe(400);
    expect((await admin.patch(url).send({ posterColor: null })).body.data.posterColor).toBeNull();
  });
});

describe("Les compteurs du Catalogue", () => {
  it("compte marques, séries, modèles, produits et stock par catégorie, brouillons compris", async () => {
    await fillSeries(prisma);
    const response = await admin.get("/admin/catalog");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      // 3 neufs de l'iPhone et 2 du brouillon Galaxy Z Flip6 ; 2 affaires en stock.
      expect.objectContaining({ slug: "smartphones", brandCount: 2, seriesCount: 2, modelCount: 2, productCount: 2, newStock: 5, dealCount: 2 }),
      expect.objectContaining({ slug: "accessoires", brandCount: 1, seriesCount: 0, modelCount: 0, productCount: 2, newStock: 15, dealCount: 0 }),
    ]);
  });

  it("compte chaque marque d'une catégorie", async () => {
    await fillSeries(prisma);
    const response = await admin.get(`/admin/catalog/categories/${catalog.phones.id}`);
    expect(response.body.data.category).toMatchObject({ id: catalog.phones.id, name: "Smartphones" });
    expect(response.body.data.brands).toEqual([
      expect.objectContaining({ slug: "iphone", seriesCount: 1, productCount: 1, newStock: 3, dealCount: 2 }),
      expect.objectContaining({ slug: "samsung", seriesCount: 1, productCount: 1, newStock: 2, dealCount: 0 }),
    ]);
  });

  it("donne les séries d'une marque avec leur stock", async () => {
    await fillSeries(prisma);
    const response = await admin.get(`/admin/catalog/brands/${catalog.iphoneBrand.id}`);
    expect(response.body.data.brand).toMatchObject({ slug: "iphone", category: { slug: "smartphones", kind: "phone" } });
    expect(response.body.data.series).toEqual([
      expect.objectContaining({ name: "iPhone 15", coverUrl: null, modelCount: 1, modelIds: [catalog.iphone.id], newStock: 3, dealCount: 2 }),
    ]);
    expect(response.body.data.unassigned).toEqual([]);
  });

  it("donne une série avec ses modèles, leur produit et les modèles qu'on peut y ajouter", async () => {
    await fillSeries(prisma);
    const plus = await appleModel("iPhone 15 Plus", 2023);
    const series = await prisma.series.findFirstOrThrow({ where: { slug: "iphone-15" } });

    const response = await admin.get(`/admin/catalog/series/${series.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.series).toMatchObject({
      name: "iPhone 15",
      // Le fabricant et le type servent au formulaire « Nouveau modèle ».
      brand: { slug: "iphone", makerName: "Apple" },
      category: { slug: "smartphones", kind: "phone" },
    });
    expect(response.body.data.models).toEqual([
      expect.objectContaining({
        id: catalog.iphone.id,
        name: "iPhone 15 Pro Max",
        seriesPosition: 0,
        product: expect.objectContaining({ id: catalog.phone.id, newStock: 3, dealCount: 2, soldOutColors: [] }),
      }),
    ]);
    // Ni le Galaxy (autre fabricant), ni le Pro Max (déjà rangé).
    expect(response.body.data.candidates).toEqual([{ id: plus.id, name: "iPhone 15 Plus", releaseYear: 2023 }]);
  });

  it("refuse le Catalogue à un client", async () => {
    const { agent: client } = await loginAs("customer");
    expect((await client.get("/admin/catalog")).status).toBe(403);
  });
});
