import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { createCatalog, resetDb } from "./helpers.js";

beforeEach(async () => {
  await resetDb();
  await createCatalog();
});

describe("GET /categories", () => {
  it("liste les catégories avec leur sorte et leur nombre de produits publiés", async () => {
    const response = await request(app).get("/categories");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({ slug: "smartphones", kind: "phone", productCount: 1 }),
      expect.objectContaining({ slug: "accessoires", kind: "accessory", productCount: 2 }),
    ]);
  });

  it("donne les marques de chaque catégorie, sans celles qui n'ont aucun produit publié", async () => {
    const response = await request(app).get("/categories");
    const [phones, accessories] = response.body.data;
    // Samsung n'a qu'un brouillon : pas de puce.
    expect(phones.brands).toEqual([{ name: "iPhone", slug: "iphone", logoUrl: "/brands/apple.svg", productCount: 1 }]);
    expect(accessories.brands).toEqual([{ name: "Anker", slug: "anker", logoUrl: null, productCount: 1 }]);
  });
});

describe("GET /products, filtre par marque", () => {
  it("garde les produits de la marque dans la catégorie", async () => {
    // La coque, publiée elle aussi dans les Accessoires, n'a pas de marque : elle sort.
    const response = await request(app).get("/products?category=accessoires&brand=anker");
    expect(response.body.data.map((p: { slug: string }) => p.slug)).toEqual(["chargeur-usb-c-20-w"]);
  });

  it("ne montre pas un brouillon, même de la bonne marque", async () => {
    const response = await request(app).get("/products?brand=samsung");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("refuse une marque qui n'a pas la forme d'un slug", async () => {
    const response = await request(app).get("/products?brand=Pas_un_slug");
    expect(response.status).toBe(400);
  });

  it("cherche aussi dans le nom de la marque, et l'affiche sur la carte sans modèle", async () => {
    const response = await request(app).get("/products?q=anker");
    expect(response.body.data).toEqual([expect.objectContaining({ slug: "chargeur-usb-c-20-w", brand: "Anker" })]);
  });
});

describe("GET /products", () => {
  it("ne montre que les produits publiés, avec la pagination", async () => {
    const response = await request(app).get("/products");
    expect(response.status).toBe(200);
    expect(response.body.data.map((p: { slug: string }) => p.slug)).not.toContain("galaxy-z-flip6");
    expect(response.body.pagination).toEqual({ page: 1, limit: 12, total: 3, pages: 1 });
  });

  it("filtre les reconditionnés disponibles et signale les affaires", async () => {
    const response = await request(app).get("/products?condition=reconditionne");
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      slug: "iphone-15-pro-max",
      hasNew: true,
      hasRefurbished: true,
      hasDeal: true,
      brand: "Apple",
    });
  });

  it("filtre les affaires : une variante en stock avec un article offert", async () => {
    const response = await request(app).get("/products?offre=affaire");
    expect(response.status).toBe(200);
    expect(response.body.data.map((p: { slug: string }) => p.slug)).toEqual(["iphone-15-pro-max"]);
  });

  it("trouve un modèle et les accessoires compatibles avec lui", async () => {
    const response = await request(app).get("/products?model=apple-iphone-15-pro-max");
    const slugs = response.body.data.map((p: { slug: string }) => p.slug).sort();
    expect(slugs).toEqual(["coque-antichoc-iphone-15-pro-max", "iphone-15-pro-max"]);
  });

  it("cherche aussi dans la marque du modèle", async () => {
    const response = await request(app).get("/products?q=apple");
    expect(response.body.data.map((p: { slug: string }) => p.slug)).toEqual(["iphone-15-pro-max"]);
  });

  it("cherche % comme un caractère, pas comme un joker", async () => {
    const response = await request(app).get("/products?q=%25");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("trie par prix croissant sur minPrice", async () => {
    const response = await request(app).get("/products?sort=prix-croissant");
    expect(response.body.data.map((p: { minPrice: number }) => p.minPrice)).toEqual([1800, 2500, 150000]);
  });

  it("refuse un tri inconnu", async () => {
    const response = await request(app).get("/products?sort=hasard");
    expect(response.status).toBe(400);
  });
});

describe("GET /products/:slug", () => {
  it("cache les reconditionnés vendus et détaille les articles offerts", async () => {
    const response = await request(app).get("/products/iphone-15-pro-max");
    expect(response.status).toBe(200);
    const skus = response.body.data.variants.map((v: { sku: string }) => v.sku);
    expect(skus).toEqual(["IP-NEW-256", "IP-R-WIFI", "IP-R-DEAL"]);
    const deal = response.body.data.variants.find((v: { sku: string }) => v.sku === "IP-R-DEAL");
    expect(deal.gifts).toEqual([
      expect.objectContaining({ sku: "CHG-20W", price: 2500, quantity: 1, available: true }),
    ]);
    expect(response.body.data.deviceModel).toEqual({
      brand: "Apple",
      name: "iPhone 15 Pro Max",
      slug: "apple-iphone-15-pro-max",
    });
  });

  it("répond 404 pour un brouillon", async () => {
    const response = await request(app).get("/products/galaxy-z-flip6");
    expect(response.status).toBe(404);
  });
});
