import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// Le prix d'achat (14/11) : l'admin le saisit, le site ne le voit jamais, chaque vente le fige.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
});

const product = (purchasePrice: number | null) => ({
  name: "Samsung Galaxy S24 Ultra",
  description: "Titane et S Pen",
  categoryId: catalog.phones.id,
  deviceModelId: catalog.galaxy.id,
  status: "published",
  variants: [{ sku: "S24U-256", options: { Stockage: "256 Go" }, price: 215000, stock: 3, warrantyMonths: 12, purchasePrice }],
});

describe("prix d'achat", () => {
  it("l'admin l'enregistre et le relit", async () => {
    const created = await admin.post("/admin/products").send(product(190000));
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.variants[0].purchasePrice).toBe(190000);
  });

  it("refuse un prix d'achat négatif", async () => {
    expect((await admin.post("/admin/products").send(product(-1))).status).toBe(400);
  });

  it("n'apparaît nulle part sur le site ni dans l'aperçu du panier", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 240000 } });
    const product = await prisma.product.findFirstOrThrow({ where: { variants: { some: { sku: "IP-NEW-256" } } } });
    const responses = await Promise.all([
      request(app).get(`/products/${product.slug}`),
      request(app).get("/products?sort=arrivages&appareils=1&enstock=1&limit=12"),
      request(app).get("/products"),
      request(app).post("/orders/preview").send({ items: [{ sku: "IP-NEW-256", quantity: 1 }] }),
    ]);
    for (const response of responses) {
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toMatch(/purchasePrice|unitCost|240000/);
    }
  });

  it("chaque vente fige le prix d'achat du moment, qui ne bouge plus ensuite", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 240000 } });
    expect((await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }])).status).toBe(201);
    await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 250000 } });
    expect((await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }])).status).toBe(201);
    const items = await prisma.orderItem.findMany({ where: { sku: "IP-NEW-256" }, orderBy: { id: "asc" } });
    expect(items.map((item) => item.unitCost)).toEqual([240000, 250000]);
  });

  it("un prix d'achat inconnu reste inconnu sur la vente", async () => {
    expect((await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }])).status).toBe(201);
    expect((await prisma.orderItem.findFirstOrThrow({ where: { sku: "IP-NEW-256" } })).unitCost).toBeNull();
  });
});
