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
  it("cherche dans plusieurs catégories sélectionnées", async () => {
    const response = await request(app).get("/products?category=smartphones&category=accessoires");
    expect(response.status).toBe(200);
    expect(response.body.data.map((product: { slug: string }) => product.slug)).toEqual(
      expect.arrayContaining(["chargeur-usb-c-20-w", "coque-antichoc-iphone-15-pro-max", "iphone-15-pro-max"]),
    );
    expect(response.body.data).toHaveLength(3);
  });

  it("ne montre que les produits publiés, avec la pagination", async () => {
    const response = await request(app).get("/products");
    expect(response.status).toBe(200);
    expect(response.body.data.map((p: { slug: string }) => p.slug)).not.toContain("galaxy-z-flip6");
    expect(response.body.pagination).toEqual({ page: 1, limit: 12, total: 3, pages: 1 });
  });

  it("filtre les affaires disponibles, sous le nouveau nom comme sous l'ancien", async () => {
    const response = await request(app).get("/products?condition=affaire");
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      slug: "iphone-15-pro-max",
      hasNew: true,
      hasRefurbished: true,
      brand: "Apple",
    });
    // Plus de marque « affaire » posée sur une variante : la famille est l'état lui-même.
    expect(response.body.data[0]).not.toHaveProperty("hasDeal");
    expect(response.body.data[0]).not.toHaveProperty("dealFrom");
    const legacy = await request(app).get("/products?condition=reconditionne");
    expect(legacy.body.data.map((p: { slug: string }) => p.slug)).toEqual(["iphone-15-pro-max"]);
  });

  // La vitrine de l'accueil : une affaire dont la fiche dit vraiment la note et la batterie
  // (les annonces importées n'en disent souvent rien).
  it("filtre les affaires à fiche complète, note et batterie connues", async () => {
    // Un modèle à lui : un produit au plus par modèle d'appareil.
    const galaxyModel = await prisma.deviceModel.create({
      data: { brand: "Samsung", name: "Galaxy S24 importé", slug: "samsung-galaxy-s24-importe", kind: "phone" },
    });
    const phones = await prisma.category.findUniqueOrThrow({ where: { slug: "smartphones" } });
    await prisma.product.create({
      data: {
        name: "Galaxy S24 Ultra importé",
        slug: "galaxy-s24-ultra-importe",
        description: "Annonce sans note",
        categoryId: phones.id,
        deviceModelId: galaxyModel.id,
        status: "published",
        variants: { create: [{ sku: "IG-SANS-NOTE", price: 150000, stock: 1, condition: "refurbished", batteryHealth: 90 }] },
      },
    });
    const all = await request(app).get("/products?condition=affaire");
    expect(all.body.data.map((p: { slug: string }) => p.slug).sort()).toEqual(["galaxy-s24-ultra-importe", "iphone-15-pro-max"]);
    const complete = await request(app).get("/products?condition=affaire&fiche=complete");
    expect(complete.body.data.map((p: { slug: string }) => p.slug)).toEqual(["iphone-15-pro-max"]);
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
    variants: {
      sku: string;
      price: number;
      stock: number;
      condition?: "new" | "refurbished";
      grade?: number;
      batteryHealth?: number;
      withBox?: boolean;
    }[],
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
      { sku: "IP16P-R", price: 90000, stock: 1, condition: "refurbished", grade: 9, batteryHealth: 90, withBox: false },
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

describe("Neuf scellé et affaires", () => {
  it("donne la boîte, les pièces compatibles et les détails d'une affaire dans la fiche", async () => {
    await prisma.productVariant.update({
      where: { sku: "IP-R-DEAL" },
      data: { replacedParts: ["Écran", "Batterie"], compatibleParts: ["Écran"], withBox: true, details: "Comme neuf" },
    });
    const response = await request(app).get("/products/iphone-15-pro-max");
    const bySku = (sku: string) => response.body.data.variants.find((v: { sku: string }) => v.sku === sku);
    expect(bySku("IP-R-DEAL")).toMatchObject({ withBox: true, compatibleParts: ["Écran"], details: "Comme neuf" });
    expect(bySku("IP-NEW-256")).toMatchObject({ withBox: null, compatibleParts: [], details: null });
    expect(bySku("IP-R-DEAL")).not.toHaveProperty("isDeal");
  });

  it("donne la garantie, l'origine et la référence de chaque variante dans la fiche", async () => {
    await prisma.productVariant.update({
      where: { sku: "IP-R-DEAL" },
      data: { warrantyMonths: 6, origin: "Europe", reference: "51057" },
    });
    const response = await request(app).get("/products/iphone-15-pro-max");
    const bySku = (sku: string) => response.body.data.variants.find((v: { sku: string }) => v.sku === sku);
    expect(bySku("IP-R-DEAL")).toMatchObject({ warrantyMonths: 6, origin: "Europe", reference: "51057" });
    expect(bySku("IP-NEW-256")).toMatchObject({ warrantyMonths: null, origin: null, reference: null });
  });

  // Les CHECK des migrations : la base refuse même si le code a un bug.
  // Depuis le vrai catalogue (partie B), une affaire peut ne rien dire de sa boîte
  // (« Boîte non précisée », annonce importée) ; un neuf scellé, jamais.
  it("la base refuse une boîte sur un neuf scellé, mais accepte une affaire sans boîte connue", async () => {
    await expect(
      prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { withBox: false } }),
    ).rejects.toThrow();
    const updated = await prisma.productVariant.update({ where: { sku: "IP-R-WIFI" }, data: { withBox: null } });
    expect(updated.withBox).toBeNull();
  });

  it("la base refuse une pièce compatible qui n'a pas été changée", async () => {
    await expect(
      prisma.productVariant.update({ where: { sku: "IP-R-WIFI" }, data: { compatibleParts: ["Caméra"] } }),
    ).rejects.toThrow();
  });
});

// L'étape Couleur (05/11) : la fiche dit les couleurs de son modèle, dans l'ordre, avec leur photo.
describe("GET /products/:slug, les couleurs du modèle", () => {
  it("donne les couleurs dans l'ordre du modèle, avec leur photo ou null", async () => {
    const model = await prisma.deviceModel.update({
      where: { slug: "apple-iphone-15-pro-max" },
      data: { colors: ["Titane naturel", "Titane bleu", "Titane blanc", "Titane noir"] },
    });
    await prisma.modelColorPhoto.create({ data: { deviceModelId: model.id, color: "Titane bleu", url: "https://x/bleu.webp" } });
    const response = await request(app).get("/products/iphone-15-pro-max");
    expect(response.body.data.colors).toEqual([
      { name: "Titane naturel", photoUrl: null },
      { name: "Titane bleu", photoUrl: "https://x/bleu.webp" },
      { name: "Titane blanc", photoUrl: null },
      { name: "Titane noir", photoUrl: null },
    ]);
  });

  it("donne une liste vide pour un accessoire", async () => {
    const response = await request(app).get("/products/chargeur-usb-c-20-w");
    expect(response.body.data.colors).toEqual([]);
  });
});

describe("GET /products/:slug, la lueur du modèle", () => {
  it("donne la lueur choisie pour le modèle, null pour un accessoire", async () => {
    await prisma.deviceModel.update({
      where: { slug: "apple-iphone-15-pro-max" },
      data: { colors: ["Titane bleu", "Titane noir"], posterColor: "Titane noir" },
    });
    expect((await request(app).get("/products/iphone-15-pro-max")).body.data.posterColor).toBe("Titane noir");
    expect((await request(app).get("/products/chargeur-usb-c-20-w")).body.data.posterColor).toBeNull();
  });
});
