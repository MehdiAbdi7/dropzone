import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { refreshMinPrice } from "../src/modules/products/product.service.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Le brouillon par variante (23/11, demande de Mehdi) : chaque variante est Brouillon ou Publiée. Une variante en
// brouillon n'est vendue nulle part (boutique, comptoir, téléphone, échange) et n'entre dans aucun prix ni stock
// affiché ; le produit, lui, reste visible, « indisponible » s'il n'a plus rien de publié.
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
});

const toDraft = async (sku: string) => {
  const variant = await prisma.productVariant.update({ where: { sku }, data: { status: "draft" } });
  await prisma.$transaction((tx) => refreshMinPrice(tx, [variant.productId]));
};

describe("une variante en brouillon, côté boutique", () => {
  it("n'apparaît pas sur la fiche publique, qui reste visible", async () => {
    await toDraft("IP-NEW-256");
    const response = await request(app).get("/products/iphone-15-pro-max");
    expect(response.status).toBe(200);
    expect(response.body.data.variants.map((v: { sku: string }) => v.sku)).not.toContain("IP-NEW-256");
  });

  it("un produit dont toutes les variantes sont en brouillon reste visible, sans stock", async () => {
    await toDraft("COQ-IP15PM");
    const page = await request(app).get("/products/coque-antichoc-iphone-15-pro-max");
    expect(page.status).toBe(200);
    expect(page.body.data.variants).toEqual([]);
    const listing = await request(app).get("/products").query({ q: "Coque antichoc" });
    expect(listing.body.data[0]).toMatchObject({ slug: "coque-antichoc-iphone-15-pro-max", inStock: false, hasNew: false });
  });

  it("ne compte ni dans les prix ni dans le stock affichés", async () => {
    const used = await prisma.productVariant.findMany({ where: { product: { slug: "iphone-15-pro-max" }, condition: "refurbished" } });
    for (const variant of used) await toDraft(variant.sku);
    const fresh = await prisma.productVariant.findMany({ where: { product: { slug: "iphone-15-pro-max" }, condition: "new", stock: { gt: 0 } } });
    const listing = await request(app).get("/products").query({ q: "iPhone 15 Pro Max", category: "smartphones" });
    const iphone = listing.body.data.find((p: { slug: string }) => p.slug === "iphone-15-pro-max");
    expect(iphone).toMatchObject({ hasRefurbished: false, refurbishedFrom: null, refurbishedCount: 0 });
    expect(iphone.minPrice).toBe(Math.min(...fresh.map((variant) => variant.price)));
  });

  it("ne peut pas être commandée", async () => {
    await toDraft("COQ-IP15PM");
    // L'aperçu du panier la range dans « indisponible », comme un article retiré du catalogue.
    const preview = await request(app).post("/orders/preview").send({ items: [{ sku: "COQ-IP15PM", quantity: 1 }] });
    expect(preview.body.data.unavailable).toEqual(["COQ-IP15PM"]);
    expect(preview.body.data.lines).toEqual([]);
  });
});

describe("une variante en brouillon, côté magasin", () => {
  it("n'est pas proposée par la recherche du comptoir", async () => {
    await toDraft("IP-NEW-256");
    const { agent } = await loginAs("admin");
    const found = await agent.get("/admin/variants").query({ q: "ip-new-256" });
    expect(found.status).toBe(200);
    expect(found.body.data.map((hit: { sku: string }) => hit.sku)).not.toContain("IP-NEW-256");
  });

  it("ne peut pas être vendue au comptoir", async () => {
    await toDraft("COQ-IP15PM");
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 0 }).expect(201);
    const sale = await agent
      .post("/admin/sales")
      .send({ fullName: "Amine Test", phone: "0555 12 34 56", method: "cash", lines: [{ sku: "COQ-IP15PM", quantity: 1 }] });
    expect(sale.status).toBeGreaterThanOrEqual(400);
  });
});

describe("le statut d'une variante dans le back-office", () => {
  it("se choisit à la création et se relit, une variante sans statut est publiée", async () => {
    const { agent } = await loginAs("admin");
    const created = await agent.post("/admin/products").send({
      name: "Galaxy S24 Ultra",
      description: "Titane et S Pen",
      categoryId: catalog.phones.id,
      deviceModelId: catalog.galaxy.id,
      specs: {},
      variants: [
        { sku: "S24U-256", options: { Stockage: "256 Go" }, price: 215000, stock: 3, warrantyMonths: 12 },
        { sku: "S24U-512", options: { Stockage: "512 Go" }, price: 245000, stock: 1, warrantyMonths: 12, status: "draft" },
      ],
    });
    expect(created.status).toBe(201);
    const product = await agent.get(`/admin/products/${created.body.data.id}`);
    const statusOf = (sku: string) => product.body.data.variants.find((v: { sku: string }) => v.sku === sku).status;
    expect(statusOf("S24U-256")).toBe("published");
    expect(statusOf("S24U-512")).toBe("draft");
    // Le produit lui-même est toujours visible.
    expect((await request(app).get(`/products/${created.body.data.slug}`)).status).toBe(200);
  });
});

// Relecture de sécurité du 23/11 : un accessoire offert passé en brouillon ne doit pas sortir à 0 DA avec l'appareil.
describe("un cadeau en brouillon", () => {
  it("n'est plus ajouté à la commande de l'appareil, le client en est prévenu", async () => {
    await toDraft("CHG-20W");
    const preview = await request(app).post("/orders/preview").send({ items: [{ sku: "IP-R-DEAL", quantity: 1 }] });
    expect(preview.body.data.lines.map((line: { sku: string }) => line.sku)).toEqual(["IP-R-DEAL"]);
    expect(preview.body.data.notices.join(" ")).toContain("n'est plus offert");
  });

  it("n'est plus proposé comme cadeau dans le back-office", async () => {
    await toDraft("CHG-20W");
    const { agent } = await loginAs("admin");
    const options = await agent.get("/admin/gift-options");
    expect(options.body.data.map((option: { sku: string }) => option.sku)).not.toContain("CHG-20W");
  });
});

// Relecture de sécurité (suite) : le même contrôle au niveau du produit de l'accessoire offert. Plus aucun produit n'est
// en brouillon depuis la migration, mais l'API accepte encore ce statut d'un ancien front.
describe("un cadeau dont le produit est en brouillon", () => {
  const productToDraft = (slug: string) => prisma.product.update({ where: { slug }, data: { status: "draft" } });

  it("n'est pas ajouté à la commande de l'appareil", async () => {
    await productToDraft("chargeur-usb-c-20-w");
    const preview = await request(app).post("/orders/preview").send({ items: [{ sku: "IP-R-DEAL", quantity: 1 }] });
    expect(preview.body.data.lines.map((line: { sku: string }) => line.sku)).toEqual(["IP-R-DEAL"]);
  });

  it("n'est pas proposé comme cadeau dans le back-office", async () => {
    await productToDraft("chargeur-usb-c-20-w");
    const { agent } = await loginAs("admin");
    const options = await agent.get("/admin/gift-options");
    expect(options.body.data.map((option: { sku: string }) => option.sku)).not.toContain("CHG-20W");
  });
});
