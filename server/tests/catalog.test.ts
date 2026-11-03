import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { slugify } from "../src/utils/slugify.js";
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

  it("donne la marque de la Boutique, pour le fil d'Ariane (null sans marque)", async () => {
    expect((await request(app).get("/products/iphone-15-pro-max")).body.data.brand).toEqual({
      name: "iPhone",
      slug: "iphone",
    });
    expect((await request(app).get("/products/coque-antichoc-iphone-15-pro-max")).body.data.brand).toBeNull();
  });
});

describe("Le parcours de la Boutique", () => {
  const slugs = (response: request.Response) => response.body.data.map((product: { slug: string }) => product.slug);

  // Un iPhone publié de plus, avec son modèle (année facultative) et ses variantes.
  async function addIphone(
    name: string,
    releaseYear: number | null,
    variants: { sku: string; price: number; stock: number; condition?: "new" | "refurbished"; grade?: number; batteryHealth?: number }[],
  ) {
    const phones = await prisma.category.findUniqueOrThrow({ where: { slug: "smartphones" } });
    const brand = await prisma.brand.findFirstOrThrow({ where: { categoryId: phones.id, slug: "iphone" } });
    const model = await prisma.deviceModel.create({
      data: { brand: "Apple", name, slug: slugify(`apple ${name}`), kind: "phone", releaseYear },
    });
    await prisma.product.create({
      data: {
        name,
        slug: slugify(name),
        description: "Test",
        categoryId: phones.id,
        deviceModelId: model.id,
        brandId: brand.id,
        status: "published",
        minPrice: Math.min(...variants.map((variant) => variant.price)),
        variants: { create: variants },
      },
    });
  }

  it("donne le prix « dès » et le stock de chaque état", async () => {
    const response = await request(app).get("/products?category=smartphones&brand=iphone");
    expect(response.body.data[0]).toEqual(
      expect.objectContaining({
        slug: "iphone-15-pro-max",
        newFrom: 245000,
        refurbishedFrom: 150000,
        newStock: 3,
        refurbishedCount: 2,
      }),
    );
  });

  it("range les modèles du plus récent au plus ancien, le plus cher d'abord la même année", async () => {
    await addIphone("iPhone 16 Pro", 2024, [
      { sku: "IP16P-NEW", price: 300000, stock: 1 },
      { sku: "IP16P-R", price: 90000, stock: 1, condition: "refurbished", grade: 9, batteryHealth: 90 },
    ]);
    await addIphone("iPhone 16", 2024, [{ sku: "IP16-NEW", price: 200000, stock: 1 }]);
    await addIphone("iPhone X", null, [{ sku: "IPX-NEW", price: 50000, stock: 1 }]);
    const response = await request(app).get("/products?category=smartphones&brand=iphone&sort=sortie");
    expect(response.status).toBe(200);
    // Le 16 Pro passe devant le 16 malgré son prix « dès » plus bas : on compare le prix le plus haut.
    expect(slugs(response)).toEqual(["iphone-16-pro", "iphone-16", "iphone-15-pro-max", "iphone-x"]);
    expect(response.body.pagination.total).toBe(4);
  });

  it("refuse le tri par sortie sans catégorie (il lit tout le filtre en mémoire)", async () => {
    expect((await request(app).get("/products?sort=sortie")).status).toBe(400);
  });

  it("liste les produits sans marque d'une catégorie avec la marque « autres »", async () => {
    expect(slugs(await request(app).get("/products?category=accessoires&brand=autres"))).toEqual([
      "coque-antichoc-iphone-15-pro-max",
    ]);
    expect(slugs(await request(app).get("/products?category=smartphones&brand=nokia"))).toEqual([]);
  });

  it("signale les catégories qui ont des produits sans marque", async () => {
    const response = await request(app).get("/categories");
    expect(response.body.data).toEqual([
      expect.objectContaining({ slug: "smartphones", hasUnbranded: false }),
      expect.objectContaining({ slug: "accessoires", hasUnbranded: true }),
    ]);
  });
});

describe("Les affaires « prix exceptionnel »", () => {
  const slugs = (response: request.Response) => response.body.data.map((product: { slug: string }) => product.slug);
  const find = (response: request.Response, slug: string) =>
    response.body.data.find((product: { slug: string }) => product.slug === slug);

  // Une affaire sans cadeau : c'est la marque posée par le gérant qui compte.
  async function addChargerDeal(stock: number) {
    const charger = await prisma.product.findUniqueOrThrow({ where: { slug: "chargeur-usb-c-20-w" } });
    await prisma.productVariant.create({
      data: { productId: charger.id, sku: "CHG-20W-SB", price: 1500, stock, isDeal: true, dealNote: "Sans boîte" },
    });
  }

  it("met dans les affaires un appareil marqué affaire, même sans cadeau", async () => {
    await addChargerDeal(2);
    const response = await request(app).get("/products?offre=affaire");
    expect(slugs(response)).toContain("chargeur-usb-c-20-w");
    expect(find(response, "chargeur-usb-c-20-w")).toMatchObject({ hasDeal: true, dealFrom: 1500, dealIn: "new" });
  });

  it("donne l'état de l'affaire et son prix sur une carte", async () => {
    const response = await request(app).get("/products?category=smartphones");
    expect(find(response, "iphone-15-pro-max")).toMatchObject({ dealFrom: 185000, dealIn: "refurbished" });
    const phone = await prisma.product.findUniqueOrThrow({ where: { slug: "iphone-15-pro-max" } });
    await prisma.productVariant.create({
      data: { productId: phone.id, sku: "IP-NEW-SB", price: 230000, stock: 1, isDeal: true },
    });
    const both = await request(app).get("/products?category=smartphones");
    expect(find(both, "iphone-15-pro-max")).toMatchObject({ dealFrom: 185000, dealIn: "both" });
  });

  it("ne garde pas une affaire épuisée", async () => {
    await addChargerDeal(0);
    const response = await request(app).get("/products?offre=affaire");
    expect(slugs(response)).not.toContain("chargeur-usb-c-20-w");
    const all = await request(app).get("/products?category=accessoires");
    expect(find(all, "chargeur-usb-c-20-w")).toMatchObject({ hasDeal: false, dealFrom: null, dealIn: null });
  });

  it("donne la marque d'affaire et les détails dans la fiche", async () => {
    await addChargerDeal(2);
    const response = await request(app).get("/products/chargeur-usb-c-20-w");
    const deal = response.body.data.variants.find((v: { sku: string }) => v.sku === "CHG-20W-SB");
    expect(deal).toMatchObject({ isDeal: true, dealNote: "Sans boîte" });
  });
});
