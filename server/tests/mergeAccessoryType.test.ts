import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { mergeAccessoryType } from "../src/scripts/lib/mergeAccessoryType.js";
import { createCatalog, resetDb } from "./helpers.js";

// La fusion du type « Câbles » dans « Chargeurs » (15/11, décision de Mehdi) : les câbles se
// rangent avec les blocs et les packs. Les produits et les marques passent dans le type de
// destination, puis l'ancien type disparaît.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let chargers: { id: number };
let cables: { id: number };
let chargersAnker: { id: number };

const create = (name: string, brandId: number, makerId: number | null) =>
  prisma.product.create({
    data: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: "Test",
      categoryId: catalog.accessories.id,
      brandId,
      makerId,
      status: "published",
      variants: { create: [{ sku: `SKU-${name}`, price: 1000, stock: 5, options: { Longueur: "1 m" } }] },
    },
  });

const run = () => prisma.$transaction((tx) => mergeAccessoryType(tx, "Câbles", "Chargeurs"));

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  chargers = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Chargeurs", slug: "chargeurs", position: 1 } });
  cables = await prisma.brand.create({ data: { categoryId: catalog.accessories.id, name: "Câbles", slug: "cables", position: 2 } });
  chargersAnker = await prisma.accessoryMaker.create({ data: { typeId: chargers.id, name: "Anker", slug: "anker", position: 0 } });
  const cablesAnker = await prisma.accessoryMaker.create({ data: { typeId: cables.id, name: "Anker", slug: "anker", position: 0 } });
  const cablesApple = await prisma.accessoryMaker.create({
    data: { typeId: cables.id, name: "Apple", slug: "apple", logoUrl: "/brands/apple.svg", position: 1 },
  });
  await create("Câble Anker", cables.id, cablesAnker.id);
  await create("Câble Apple", cables.id, cablesApple.id);
  await create("Câble générique", cables.id, null);
});

describe("mergeAccessoryType", () => {
  it("range les produits du type Câbles dans Chargeurs", async () => {
    const report = await run();
    expect(report.moved.sort()).toEqual(["Câble Anker", "Câble Apple", "Câble générique"]);
    expect(await prisma.product.count({ where: { brandId: cables.id } })).toBe(0);
    expect(await prisma.product.count({ where: { brandId: chargers.id, name: { startsWith: "Câble" } } })).toBe(3);
  });

  it("reprend la marque déjà présente dans Chargeurs au lieu d'en créer une deuxième", async () => {
    await run();
    const anker = await prisma.product.findFirstOrThrow({ where: { name: "Câble Anker" } });
    expect(anker.makerId).toBe(chargersAnker.id);
    expect(await prisma.accessoryMaker.count({ where: { typeId: chargers.id, slug: "anker" } })).toBe(1);
  });

  it("crée dans Chargeurs la marque qui n'y était pas, avec son logo, à la suite des autres", async () => {
    const report = await run();
    expect(report.makersCreated).toEqual(["Apple"]);
    const apple = await prisma.accessoryMaker.findFirstOrThrow({ where: { typeId: chargers.id, slug: "apple" } });
    expect(apple).toMatchObject({ name: "Apple", logoUrl: "/brands/apple.svg", position: 1 });
    expect((await prisma.product.findFirstOrThrow({ where: { name: "Câble Apple" } })).makerId).toBe(apple.id);
  });

  it("laisse sans marque un câble qui n'en avait pas", async () => {
    await run();
    expect((await prisma.product.findFirstOrThrow({ where: { name: "Câble générique" } })).makerId).toBeNull();
  });

  it("supprime le type Câbles et ses marques", async () => {
    const report = await run();
    expect(report.typeRemoved).toBe(true);
    expect(await prisma.brand.findUnique({ where: { id: cables.id } })).toBeNull();
    expect(await prisma.accessoryMaker.count({ where: { typeId: cables.id } })).toBe(0);
  });

  it("garde les variantes, les prix et les stocks des câbles", async () => {
    await run();
    const variant = await prisma.productVariant.findFirstOrThrow({ where: { sku: "SKU-Câble Anker" } });
    expect(variant).toMatchObject({ price: 1000, stock: 5 });
  });

  it("relancé, il ne change rien", async () => {
    await run();
    const second = await run();
    expect(second).toEqual({ moved: [], makersCreated: [], typeRemoved: false });
    expect(await prisma.product.count({ where: { brandId: chargers.id } })).toBe(3);
  });

  it("renomme le type quand Chargeurs n'existe pas encore", async () => {
    await prisma.accessoryMaker.deleteMany({ where: { typeId: chargers.id } });
    await prisma.brand.delete({ where: { id: chargers.id } });
    const report = await run();
    expect(report.typeRemoved).toBe(false);
    const renamed = await prisma.brand.findUniqueOrThrow({ where: { id: cables.id } });
    expect(renamed).toMatchObject({ name: "Chargeurs", slug: "chargeurs" });
    expect(await prisma.product.count({ where: { brandId: cables.id } })).toBe(3);
  });
});
