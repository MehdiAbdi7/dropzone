import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, resetDb } from "./helpers.js";

// Le catalogue des accessoires en un appel (12/11) : la page Accessoires de la Boutique filtre
// par type et par marque sur place, sans autre appel.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let chargers: { id: number };
let cases: { id: number };

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  // Le type « Anker » du catalogue de test (position 0) et son chargeur restent ; on ajoute deux types.
  chargers = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Chargeurs", slug: "chargeurs", position: 1 } });
  cases = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Coques", slug: "coques", position: 2 } });
});

type Variant = { sku: string; price: number; stock: number; options?: object };
const make = (name: string, typeId: number, makerId: number | null, status: "published" | "draft", variants: Variant[]) =>
  prisma.product.create({
    data: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: `${name} : description`,
      categoryId: catalog.accessories.id,
      brandId: typeId,
      makerId,
      status,
      images: { create: [{ url: "/products/charger.svg" }] },
      variants: { create: variants },
    },
  });

async function setup() {
  const apple = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Apple", slug: "apple", position: 0 } });
  const anker = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Anker", slug: "anker", position: 1 } });
  await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Vide", slug: "vide", position: 2 } });
  await make("Bloc Anker", chargers.id, anker.id, "published", [
    { sku: "A-20", price: 3500, stock: 10, options: { Puissance: "20 W" } },
    { sku: "A-30", price: 4500, stock: 0, options: { Puissance: "30 W" } },
    { sku: "A-20B", price: 3500, stock: 1, options: { Puissance: "20 W" } },
  ]);
  await make("Bloc Apple", chargers.id, apple.id, "published", [{ sku: "AP-20", price: 6500, stock: 4, options: { Puissance: "20 W" } }]);
  await make("Brouillon Anker", chargers.id, anker.id, "draft", [{ sku: "A-DRAFT", price: 100, stock: 1 }]);
  await make("Coque sans marque", cases.id, null, "published", [{ sku: "COQ-1", price: 2500, stock: 0 }]);
}

const get = () => request(app).get("/accessories/accessoires");

describe("GET /accessories/:category", () => {
  it("rend les types, leurs marques et les produits publiés", async () => {
    await setup();
    const response = await get();
    expect(response.status).toBe(200);
    const { category, types, products } = response.body.data;
    expect(category).toEqual({ name: "Accessoires", slug: "accessoires" });
    expect(types.map((t: { slug: string }) => t.slug)).toEqual(["anker", "chargeurs", "coques"]);
    expect(types[1].makers).toEqual([
      { name: "Apple", slug: "apple", logoUrl: null },
      { name: "Anker", slug: "anker", logoUrl: null },
    ]);
    expect(products.map((p: { name: string }) => p.name)).toEqual([
      "Chargeur USB-C 20 W",
      "Bloc Apple",
      "Bloc Anker",
      "Coque sans marque",
    ]);
  });

  it("un brouillon n'apparaît pas", async () => {
    await setup();
    const { products } = (await get()).body.data;
    expect(products.some((p: { name: string }) => p.name === "Brouillon Anker")).toBe(false);
  });

  it("une marque sans produit publié n'apparaît pas dans son type", async () => {
    await setup();
    const { types } = (await get()).body.data;
    expect(types[1].makers.some((m: { slug: string }) => m.slug === "vide")).toBe(false);
  });

  it("un produit sans marque a maker à null", async () => {
    await setup();
    const { products } = (await get()).body.data;
    expect(products.find((p: { name: string }) => p.name === "Coque sans marque")).toMatchObject({ type: "coques", maker: null });
  });

  it("options donne les valeurs distinctes dans l'ordre", async () => {
    await setup();
    const { products } = (await get()).body.data;
    expect(products.find((p: { name: string }) => p.name === "Bloc Anker")).toMatchObject({
      type: "chargeurs",
      maker: { name: "Anker", slug: "anker" },
      image: "/products/charger.svg",
      options: { Puissance: ["20 W", "30 W"] },
    });
  });

  it("hasRange, minPrice et inStock", async () => {
    await setup();
    const { products } = (await get()).body.data;
    const byName = (name: string) => products.find((p: { name: string }) => p.name === name);
    expect(byName("Bloc Anker")).toMatchObject({ hasRange: true, minPrice: 3500, inStock: true });
    expect(byName("Bloc Apple")).toMatchObject({ hasRange: false, minPrice: 6500, inStock: true });
    // Rien en stock : le prix le plus bas tout court, et « épuisé ».
    expect(byName("Coque sans marque")).toMatchObject({ hasRange: false, minPrice: 2500, inStock: false });
  });

  it("404 pour une catégorie d'appareils ou inconnue", async () => {
    expect((await request(app).get("/accessories/smartphones")).status).toBe(404);
    expect((await request(app).get("/accessories/nope")).status).toBe(404);
  });

  it("l'ancienne route d'affiche n'existe plus", async () => {
    await setup();
    expect((await request(app).get("/accessories/accessoires/chargeurs/anker")).status).toBe(404);
  });
});
