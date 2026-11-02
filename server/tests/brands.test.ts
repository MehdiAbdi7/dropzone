import { beforeEach, describe, expect, it } from "vitest";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
});

describe("Marques du back-office", () => {
  it("liste toutes les marques, même celles qui n'ont qu'un brouillon", async () => {
    const response = await admin.get("/admin/brands");
    expect(response.status).toBe(200);
    expect(response.body.data.map((b: { slug: string; categoryId: number; productCount: number }) => [
      b.slug,
      b.categoryId,
      b.productCount,
    ])).toEqual([
      ["iphone", catalog.phones.id, 1],
      ["samsung", catalog.phones.id, 1],
      ["anker", catalog.accessories.id, 1],
    ]);
  });

  it("pose tout seul le logo d'une marque de la bibliothèque, en fin de liste", async () => {
    const response = await admin.post(`/admin/categories/${catalog.accessories.id}/brands`).send({ name: "Samsung" });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "Samsung",
      slug: "samsung",
      logoUrl: "/brands/samsung.svg",
      categoryId: catalog.accessories.id,
      position: 1,
    });
  });

  it("crée sans logo une marque absente de la bibliothèque", async () => {
    const response = await admin.post(`/admin/categories/${catalog.phones.id}/brands`).send({ name: "Realme" });
    expect(response.status).toBe(201);
    expect(response.body.data.logoUrl).toBeNull();
  });

  it("refuse une marque déjà présente dans la catégorie", async () => {
    const response = await admin.post(`/admin/categories/${catalog.phones.id}/brands`).send({ name: "iPhone" });
    expect(response.status).toBe(409);
  });

  it("refuse de supprimer une marque utilisée, accepte une marque vide", async () => {
    expect((await admin.delete(`/admin/brands/${catalog.iphoneBrand.id}`)).status).toBe(409);
    const created = await admin.post(`/admin/categories/${catalog.phones.id}/brands`).send({ name: "Realme" });
    expect((await admin.delete(`/admin/brands/${created.body.data.id}`)).status).toBe(204);
  });

  it("n'accepte comme logo choisi qu'un fichier de la bibliothèque", async () => {
    const url = `/admin/brands/${catalog.ankerBrand.id}`;
    expect((await admin.patch(url).send({ logoUrl: "https://exemple.com/logo.svg" })).status).toBe(400);
    const response = await admin.patch(url).send({ name: "Anker Pro", logoUrl: "/brands/sony.svg" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: "Anker Pro", slug: "anker-pro", logoUrl: "/brands/sony.svg" });
  });

  it("refuse l'envoi d'un logo sans image", async () => {
    const response = await admin.post(`/admin/brands/${catalog.ankerBrand.id}/logo`);
    expect(response.status).toBe(400);
  });

  it("interdit les marques à un client", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/brands")).status).toBe(403);
  });
});

describe("Marque d'un produit", () => {
  const body = (brandId: number) => ({
    name: "Samsung Galaxy S24 Ultra",
    description: "Titane et S Pen",
    categoryId: catalog.phones.id,
    deviceModelId: catalog.galaxy.id,
    brandId,
    status: "published",
    variants: [{ sku: "S24U-256", price: 215000, stock: 3 }],
  });

  it("refuse une marque d'une autre catégorie", async () => {
    const response = await admin.post("/admin/products").send(body(catalog.ankerBrand.id));
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Cette marque n'appartient pas à la catégorie");
  });

  it("range le produit dans sa marque", async () => {
    const created = await admin.post("/admin/products").send(body(catalog.samsungBrand.id));
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.brand).toMatchObject({ id: catalog.samsungBrand.id, slug: "samsung" });
  });
});
