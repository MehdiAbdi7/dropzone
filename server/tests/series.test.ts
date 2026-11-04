import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { fillSeries } from "../src/scripts/series.js";
import { createCatalog, resetDb } from "./helpers.js";

let catalog: Awaited<ReturnType<typeof createCatalog>>;

// Un deuxième modèle de la série iPhone 15, avec des couleurs : Noir en stock, Rose épuisé
// en neuf, une affaire Bleu vendue (à ne pas montrer) et une affaire Vert en stock.
async function addIphone15() {
  const model = await prisma.deviceModel.create({
    data: { brand: "Apple", name: "iPhone 15", slug: "apple-iphone-15", kind: "phone", releaseYear: 2023 },
  });
  const product = await prisma.product.create({
    data: {
      name: "iPhone 15",
      slug: "iphone-15",
      description: "Aluminium",
      categoryId: catalog.phones.id,
      deviceModelId: model.id,
      brandId: catalog.iphoneBrand.id,
      status: "published",
      specs: { Écran: "6,1 pouces", Puce: "A16 Bionic", "Appareil photo": "48 Mpx", Batterie: "3 349 mAh", Connecteur: "USB-C" },
      variants: {
        create: [
          { sku: "IP15-NOIR", price: 165000, stock: 2, options: { Couleur: "Noir" } },
          { sku: "IP15-ROSE", price: 165000, stock: 0, options: { Couleur: "Rose" } },
          {
            sku: "IP15-R-BLEU",
            price: 99000,
            stock: 0,
            condition: "refurbished",
            grade: 9,
            batteryHealth: 90,
            withBox: false,
            options: { Couleur: "Bleu" },
          },
          {
            sku: "IP15-R-VERT",
            price: 120000,
            stock: 1,
            condition: "refurbished",
            grade: 9,
            batteryHealth: 88,
            withBox: false,
            options: { Couleur: "Vert" },
          },
        ],
      },
    },
  });
  return { model, product };
}

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
});

describe("GET /series : les séries d'une marque", () => {
  it("donne chaque série avec ses modèles, son prix « dès » et de quoi faire l'affiche de secours", async () => {
    await fillSeries(prisma);
    const response = await request(app).get("/series?category=smartphones&brand=iphone");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        name: "iPhone 15",
        slug: "iphone-15",
        coverUrl: null,
        models: ["iPhone 15 Pro Max"],
        // Le plus bas en stock : l'affaire Wi-Fi à 150 000 DA (la vendue à 120 000 ne compte pas).
        fromPrice: 150000,
        soldOut: false,
        fallback: { image: null, color: null },
      },
    ]);
  });

  it("met d'abord la série dont le modèle est le plus récent", async () => {
    const model = await prisma.deviceModel.create({
      data: { brand: "Apple", name: "iPhone 16", slug: "apple-iphone-16", kind: "phone", releaseYear: 2024 },
    });
    await prisma.product.create({
      data: {
        name: "iPhone 16",
        slug: "iphone-16",
        description: "Nouveau",
        categoryId: catalog.phones.id,
        deviceModelId: model.id,
        brandId: catalog.iphoneBrand.id,
        status: "published",
        variants: { create: [{ sku: "IP16", price: 190000, stock: 1 }] },
      },
    });
    await fillSeries(prisma);

    const response = await request(app).get("/series?category=smartphones&brand=iphone");
    expect(response.body.data.map((s: { slug: string }) => s.slug)).toEqual(["iphone-16", "iphone-15"]);
  });

  it("à année égale, met d'abord la série la plus récente dans son ensemble (16e de 2025 ne fait pas passer la 16 devant la 17)", async () => {
    const add = async (name: string, releaseYear: number) => {
      const slug = name.toLowerCase().replace(/ /g, "-");
      const model = await prisma.deviceModel.create({
        data: { brand: "Apple", name, slug: `apple-${slug}`, kind: "phone", releaseYear },
      });
      await prisma.product.create({
        data: {
          name,
          slug,
          description: name,
          categoryId: catalog.phones.id,
          deviceModelId: model.id,
          brandId: catalog.iphoneBrand.id,
          status: "published",
          variants: { create: [{ sku: slug.toUpperCase(), price: 100000, stock: 1 }] },
        },
      });
    };
    await add("iPhone 16", 2024);
    await add("iPhone 16e", 2025);
    await add("iPhone 17", 2025);
    await fillSeries(prisma);

    const response = await request(app).get("/series?category=smartphones&brand=iphone");
    expect(response.body.data.map((s: { slug: string }) => s.slug)).toEqual(["iphone-17", "iphone-16", "iphone-15"]);
  });

  it("n'affiche pas une série dont le seul produit est un brouillon", async () => {
    await fillSeries(prisma);
    // Le Galaxy Z Flip6 du catalogue de test est en brouillon, sur le modèle Galaxy S24 Ultra.
    const response = await request(app).get("/series?category=smartphones&brand=samsung");
    expect(response.body.data).toEqual([]);
  });

  it("garde une série où tout est épuisé, marquée épuisée et sans prix", async () => {
    await fillSeries(prisma);
    await prisma.productVariant.updateMany({ where: { productId: catalog.phone.id }, data: { stock: 0 } });

    const response = await request(app).get("/series?category=smartphones&brand=iphone");
    expect(response.body.data[0]).toMatchObject({ slug: "iphone-15", soldOut: true, fromPrice: null });
  });

  it("refuse une demande sans marque", async () => {
    const response = await request(app).get("/series?category=smartphones");
    expect(response.status).toBe(400);
  });
});

describe("GET /series/:category/:brand/:serie : l'affiche", () => {
  it("donne les modèles dans l'ordre, avec 4 caractéristiques, leurs couleurs et leurs prix", async () => {
    const { product } = await addIphone15();
    await fillSeries(prisma);

    const response = await request(app).get("/series/smartphones/iphone/iphone-15");
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "iPhone 15",
      slug: "iphone-15",
      category: { name: "Smartphones", slug: "smartphones" },
      brand: { name: "iPhone", slug: "iphone" },
    });
    const [proMax, iphone15] = response.body.data.models;
    expect(proMax).toMatchObject({ name: "iPhone 15 Pro Max", productSlug: "iphone-15-pro-max", newFrom: 245000, dealFrom: 150000 });
    expect(iphone15).toEqual({
      name: "iPhone 15",
      productSlug: product.slug,
      image: null,
      specs: [
        ["Écran", "6,1 pouces"],
        ["Puce", "A16 Bionic"],
        ["Appareil photo", "48 Mpx"],
        ["Batterie", "3 349 mAh"],
      ],
      colors: [
        { name: "Noir", inStock: true },
        { name: "Rose", inStock: false },
        { name: "Vert", inStock: true },
      ],
      newFrom: 165000,
      dealFrom: 120000,
      soldOut: false,
      posterColor: "Noir",
    });
  });

  it("prend la couleur d'affiche choisie par le gérant", async () => {
    const { model } = await addIphone15();
    await fillSeries(prisma);
    await prisma.deviceModel.update({ where: { id: model.id }, data: { posterColor: "Rose" } });

    const response = await request(app).get("/series/smartphones/iphone/iphone-15");
    expect(response.body.data.models[1].posterColor).toBe("Rose");
  });

  it("n'affiche pas un modèle de la série qui n'a pas de produit publié", async () => {
    await prisma.deviceModel.create({
      data: { brand: "Apple", name: "iPhone 15 Plus", slug: "apple-iphone-15-plus", kind: "phone", releaseYear: 2023 },
    });
    await fillSeries(prisma);

    const response = await request(app).get("/series/smartphones/iphone/iphone-15");
    expect(response.body.data.models.map((m: { name: string }) => m.name)).toEqual(["iPhone 15 Pro Max"]);
  });

  it("répond 404 pour une série inconnue", async () => {
    const response = await request(app).get("/series/smartphones/iphone/inconnue");
    expect(response.status).toBe(404);
  });
});

describe("GET /products/:slug, la série du produit", () => {
  it("donne la série pour le fil d'Ariane", async () => {
    await fillSeries(prisma);
    const response = await request(app).get("/products/iphone-15-pro-max");
    expect(response.body.data.series).toEqual({ name: "iPhone 15", slug: "iphone-15" });
  });

  it("donne null pour un produit sans série", async () => {
    const response = await request(app).get("/products/chargeur-usb-c-20-w");
    expect(response.body.data.series).toBeNull();
  });
});
