import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { fillSeries } from "../src/scripts/lib/series.js";
import { createCatalog, resetDb } from "./helpers.js";

let catalog: Awaited<ReturnType<typeof createCatalog>>;

// Un deuxième modèle de la série iPhone 15, avec des couleurs : Noir en stock, Rose épuisé
// en neuf, une affaire Bleu vendue (à ne pas montrer) et une affaire Vert en stock.
async function addIphone15() {
  const model = await prisma.deviceModel.create({
    data: {
      brand: "Apple",
      name: "iPhone 15",
      slug: "apple-iphone-15",
      kind: "phone",
      releaseYear: 2023,
    },
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
      specs: {
        Écran: "6,1 pouces",
        Puce: "A16 Bionic",
        "Appareil photo": "48 Mpx",
        Batterie: "3 349 mAh",
        Connecteur: "USB-C",
      },
      variants: {
        create: [
          {
            sku: "IP15-NOIR",
            price: 165000,
            stock: 2,
            options: { Couleur: "Noir" },
          },
          {
            sku: "IP15-ROSE",
            price: 165000,
            stock: 0,
            options: { Couleur: "Rose" },
          },
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
    const response = await request(app).get(
      "/series?category=smartphones&brand=iphone",
    );
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
      data: {
        brand: "Apple",
        name: "iPhone 16",
        slug: "apple-iphone-16",
        kind: "phone",
        releaseYear: 2024,
      },
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

    const response = await request(app).get(
      "/series?category=smartphones&brand=iphone",
    );
    expect(response.body.data.map((s: { slug: string }) => s.slug)).toEqual([
      "iphone-16",
      "iphone-15",
    ]);
  });

  it("à année égale, met d'abord la série la plus récente dans son ensemble (16e de 2025 ne fait pas passer la 16 devant la 17)", async () => {
    const add = async (name: string, releaseYear: number) => {
      const slug = name.toLowerCase().replace(/ /g, "-");
      const model = await prisma.deviceModel.create({
        data: {
          brand: "Apple",
          name,
          slug: `apple-${slug}`,
          kind: "phone",
          releaseYear,
        },
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
          variants: {
            create: [{ sku: slug.toUpperCase(), price: 100000, stock: 1 }],
          },
        },
      });
    };
    await add("iPhone 16", 2024);
    await add("iPhone 16e", 2025);
    await add("iPhone 17", 2025);
    await fillSeries(prisma);

    const response = await request(app).get(
      "/series?category=smartphones&brand=iphone",
    );
    expect(response.body.data.map((s: { slug: string }) => s.slug)).toEqual([
      "iphone-17",
      "iphone-16",
      "iphone-15",
    ]);
  });

  it("cite aussi les modèles pas encore en vente, et garde la lueur de secours du premier en vente", async () => {
    await prisma.deviceModel.create({
      data: {
        brand: "Apple",
        name: "iPhone 15 Plus",
        slug: "apple-iphone-15-plus",
        kind: "phone",
        releaseYear: 2023,
        colors: ["Jaune"],
      },
    });
    await fillSeries(prisma);
    await prisma.deviceModel.updateMany({
      where: { name: "iPhone 15 Plus" },
      data: { seriesPosition: 0 },
    });
    // Sans lueur choisie, la première couleur officielle du Pro Max.
    await prisma.deviceModel.updateMany({
      where: { name: "iPhone 15 Pro Max" },
      data: { seriesPosition: 1, colors: ["Noir", "Bleu"] },
    });

    const response = await request(app).get(
      "/series?category=smartphones&brand=iphone",
    );
    expect(response.body.data[0]).toMatchObject({
      models: ["iPhone 15 Plus", "iPhone 15 Pro Max"],
      fallback: { color: "Noir" },
    });
  });

  it("n'affiche pas une série dont le seul produit est un brouillon", async () => {
    await fillSeries(prisma);
    // Le Galaxy Z Flip6 du catalogue de test est en brouillon, sur le modèle Galaxy S24 Ultra.
    const response = await request(app).get(
      "/series?category=smartphones&brand=samsung",
    );
    expect(response.body.data).toEqual([]);
  });

  it("garde une série où tout est épuisé, marquée épuisée et sans prix", async () => {
    await fillSeries(prisma);
    await prisma.productVariant.updateMany({
      where: { productId: catalog.phone.id },
      data: { stock: 0 },
    });

    const response = await request(app).get(
      "/series?category=smartphones&brand=iphone",
    );
    expect(response.body.data[0]).toMatchObject({
      slug: "iphone-15",
      soldOut: true,
      fromPrice: null,
    });
  });

  it("refuse une demande sans marque", async () => {
    const response = await request(app).get("/series?category=smartphones");
    expect(response.status).toBe(400);
  });
});

describe("GET /series/:category/:brand/:serie : l'affiche", () => {
  it("donne les modèles dans l'ordre, avec les caractéristiques téléphone dont le connecteur, leurs couleurs et leurs prix", async () => {
    const { model, product } = await addIphone15();
    await fillSeries(prisma);
    // Les couleurs de l'iPhone 15 dans le monde : Jaune et Bleu ne sont pas en boutique,
    // Rose est épuisé, Vert n'est qu'une affaire. Toutes s'affichent, dans cet ordre.
    await prisma.deviceModel.update({
      where: { id: model.id },
      data: { colors: ["Noir", "Bleu", "Vert", "Jaune", "Rose"] },
    });

    const response = await request(app).get(
      "/series/smartphones/iphone/iphone-15",
    );
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "iPhone 15",
      slug: "iphone-15",
      category: { name: "Smartphones", slug: "smartphones" },
      brand: { name: "iPhone", slug: "iphone" },
    });
    const [proMax, iphone15] = response.body.data.models;
    expect(proMax).toMatchObject({
      name: "iPhone 15 Pro Max",
      productSlug: "iphone-15-pro-max",
      newFrom: 245000,
      dealFrom: 150000,
    });
    expect(iphone15).toEqual({
      name: "iPhone 15",
      productSlug: product.slug,
      image: null,
      specs: [
        ["Écran", "6,1 pouces"],
        ["Puce", "A16 Bionic"],
        ["Appareil photo", "48 Mpx"],
        ["Batterie", "3 349 mAh"],
        ["Connecteur", "USB-C"],
      ],
      colors: ["Noir", "Bleu", "Vert", "Jaune", "Rose"],
      newFrom: 165000,
      dealFrom: 120000,
      soldOut: false,
      onSale: true,
      posterColor: "Noir",
    });
  });

  it("prend la lueur choisie par le gérant, même pour une couleur qui n'est pas en boutique", async () => {
    const { model } = await addIphone15();
    await fillSeries(prisma);
    // Jaune : aucune variante jaune en boutique, mais c'est une couleur de l'iPhone 15.
    await prisma.deviceModel.update({
      where: { id: model.id },
      data: { colors: ["Noir", "Jaune"], posterColor: "Jaune" },
    });

    const response = await request(app).get(
      "/series/smartphones/iphone/iphone-15",
    );
    expect(response.body.data.models[1].posterColor).toBe("Jaune");
  });

  it("remplace une lueur qui n'est plus une couleur du modèle par la première couleur officielle", async () => {
    const { model } = await addIphone15();
    await fillSeries(prisma);
    await prisma.deviceModel.update({
      where: { id: model.id },
      data: { colors: ["Noir", "Jaune"], posterColor: "Burgundy" },
    });

    const response = await request(app).get(
      "/series/smartphones/iphone/iphone-15",
    );
    expect(response.body.data.models[1].posterColor).toBe("Noir");
  });

  // Règle de Mehdi (05/11) : toute la série reste visible, comme les cartes Neuf et Affaire
  // barrées. Un modèle sans fiche publiée (aucune, ou un brouillon) est grisé, sans lien.
  it("montre aussi un modèle sans fiche publiée, à sa place dans l'ordre du Catalogue, grisé et sans prix", async () => {
    // Le Plus a ses couleurs officielles : elles s'affichent même sans fiche, ce sont des
    // faits du modèle, pas de la boutique.
    const plus = await prisma.deviceModel.create({
      data: {
        brand: "Apple",
        name: "iPhone 15 Plus",
        slug: "apple-iphone-15-plus",
        kind: "phone",
        releaseYear: 2023,
        colors: ["Rose", "Jaune"],
      },
    });
    const { model: iphone15, product } = await addIphone15();
    await prisma.product.update({
      where: { id: product.id },
      data: { status: "draft" },
    });
    await fillSeries(prisma);
    // L'ordre choisi dans le Catalogue : iPhone 15, iPhone 15 Plus, puis le Pro Max.
    await prisma.deviceModel.update({
      where: { id: iphone15.id },
      data: { seriesPosition: 0 },
    });
    await prisma.deviceModel.update({
      where: { id: plus.id },
      data: { seriesPosition: 1 },
    });
    await prisma.deviceModel.updateMany({
      where: { name: "iPhone 15 Pro Max" },
      data: { seriesPosition: 2 },
    });

    const response = await request(app).get(
      "/series/smartphones/iphone/iphone-15",
    );
    const models = response.body.data.models;
    expect(models.map((m: { name: string }) => m.name)).toEqual([
      "iPhone 15",
      "iPhone 15 Plus",
      "iPhone 15 Pro Max",
    ]);
    const notOnSale = {
      productSlug: null,
      image: null,
      specs: [],
      colors: [],
      newFrom: null,
      dealFrom: null,
      soldOut: true,
      onSale: false,
      posterColor: null,
    };
    // Le brouillon ne montre rien de sa fiche : ni photo, ni prix, ni lien.
    expect(models[0]).toEqual({ name: "iPhone 15", ...notOnSale });
    expect(models[1]).toEqual({
      name: "iPhone 15 Plus",
      ...notOnSale,
      colors: ["Rose", "Jaune"],
      posterColor: "Rose",
    });
    expect(models[2]).toMatchObject({
      name: "iPhone 15 Pro Max",
      onSale: true,
      soldOut: false,
    });
  });

  it("répond 404 pour une série dont aucun modèle n'est en vente", async () => {
    await fillSeries(prisma);
    // Le Galaxy Z Flip6 du catalogue de test est en brouillon : sa série n'a rien en vente.
    const series = await prisma.series.findFirstOrThrow({
      where: { brand: { slug: "samsung" } },
    });
    const response = await request(app).get(
      `/series/smartphones/samsung/${series.slug}`,
    );
    expect(response.status).toBe(404);
  });

  it("répond 404 pour une série inconnue", async () => {
    const response = await request(app).get(
      "/series/smartphones/iphone/inconnue",
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /products/:slug, la série du produit", () => {
  it("donne la série pour le fil d'Ariane", async () => {
    await fillSeries(prisma);
    const response = await request(app).get("/products/iphone-15-pro-max");
    expect(response.body.data.series).toEqual({
      name: "iPhone 15",
      slug: "iphone-15",
    });
  });

  it("donne null pour un produit sans série", async () => {
    const response = await request(app).get("/products/chargeur-usb-c-20-w");
    expect(response.body.data.series).toBeNull();
  });
});
